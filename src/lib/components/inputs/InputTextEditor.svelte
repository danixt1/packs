<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
import { Decoration, EditorView, MatchDecorator, ViewPlugin, keymap, type DecorationSet } from '@codemirror/view';
	import { basicSetup } from 'codemirror';
	import { markdown } from '@codemirror/lang-markdown';
	import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
	import { linter, type Diagnostic } from '@codemirror/lint';
	import BaseInput from './BaseInput.svelte';
	import type { WorldEditor } from '$lib/shared/worldEditor';

	type Mode = 'display' | 'template';
	interface Props {
		id: string;
		value?: string;
		label?: string;
		wrapDiv?: boolean;
		required?: boolean;
		singleLine?: boolean;
		mode: Mode;
		editor: WorldEditor;
		roleFields?: Record<string, string[]>;
		tempVars?: string[];
	}

	let {
		id,
		value = $bindable(''),
		label,
		wrapDiv,
		required = false,
		singleLine = false,
		mode,
		editor,
		roleFields = {},
		tempVars = []
	}: Props = $props();
	let mount: HTMLDivElement;
	let view: EditorView | undefined;
	const interpolationMatcher = new MatchDecorator({
		regexp: /(?<!\\)\$[^$\n]+\$/g,
		decoration: Decoration.mark({ class: 'cm-variable-interpolation' })
	});
	const interpolationHighlight = ViewPlugin.fromClass(class {
		decorations: DecorationSet;
		constructor(view: EditorView) { this.decorations = interpolationMatcher.createDeco(view); }
		update(update: Parameters<typeof interpolationMatcher.updateDeco>[0]) {
			this.decorations = interpolationMatcher.updateDeco(update, this.decorations);
		}
	}, { decorations: (plugin) => plugin.decorations });

	const variableScopes = [
		{ prefix: 'target:character-variable', source: 'character' },
		{ prefix: 'target:character/place-variable', source: 'place' },
		{ prefix: 'target:place-variable', source: 'place' },
		{ prefix: 'target:item-variable', source: 'item' },
		{ prefix: 'self-variable', source: 'self' },
		{ prefix: 'world-variable', source: 'world' },
		{ prefix: 'temp-variable', source: 'temp' }
	] as const;
	const metadataScopes = [
		{ prefix: 'target:character-metadata', values: ['idPlace', 'isPlayer', 'isObserved', 'name', 'id'] },
		{ prefix: 'target:character/place-metadata', values: ['name', 'description', 'id'] },
		{ prefix: 'target:place-metadata', values: ['name', 'description', 'id'] },
		{ prefix: 'target:item-metadata', values: ['name', 'description', 'id'] },
		{ prefix: 'self-metadata', values: ['idPlace', 'isPlayer', 'isObserved', 'name', 'id'] },
		{ prefix: 'world-metadata', values: ['time'] }
	] as const;

	function getVariableNames(source: (typeof variableScopes)[number]['source']) {
		return Array.from(new Set([
			...editor.getVarsNameFrom(source),
			...(source === 'temp' ? tempVars : [])
		]));
	}

	function unmatchedPlaceholderStart(text: string, end = text.length) {
		let openStart = -1;
		for (let index = 0; index < end; index++) {
			if (text[index] !== '$') continue;
			let slashCount = 0;
			for (let previous = index - 1; previous >= 0 && text[previous] === '\\'; previous--) slashCount++;
			if (slashCount % 2 === 1) continue;
			openStart = openStart < 0 ? index : -1;
		}
		return openStart;
	}

	function findOpenPlaceholder(context: CompletionContext) {
		const before = context.state.sliceDoc(0, context.pos);
		const start = unmatchedPlaceholderStart(before);
		if (start < 0) return null;
		const inside = before.slice(start + 1);
		if (inside.includes('$') || inside.includes('\n')) return null;
		return { from: start, inside };
	}

	function complete(context: CompletionContext) {
		const open = findOpenPlaceholder(context);
		if (!open) return null;
		const { from, inside } = open;
		if (mode === 'display') {
			const scopeMatch = variableScopes.find(({ prefix }) => inside.startsWith(`${prefix}:`));
			const metadataMatch = metadataScopes.find(({ prefix }) => inside.startsWith(`${prefix}:`));
			if (scopeMatch || metadataMatch) {
				const prefix = scopeMatch?.prefix ?? metadataMatch!.prefix;
				const variableStart = from + 1 + prefix.length + 1;
				const names = scopeMatch ? getVariableNames(scopeMatch.source) : [...metadataMatch!.values];
				const options = names.map((name) => ({
					label: name,
					type: 'variable',
					apply: `${name}$`
				}));
				return { from: variableStart, options, validFor: /^[\w]*$/ };
			}
			const options = [...variableScopes, ...metadataScopes].map(({ prefix }) => ({
				label: `$${prefix}:`,
				type: 'keyword',
				apply: `$${prefix}:`
			}));
			return { from, options, filter: true };
		}

		const slash = inside.indexOf('/');
		if (slash < 0) {
			const options = Object.keys(roleFields).map((role) => ({
				label: `$${role}/`,
				type: 'namespace',
				apply: `$${role}/`
			}));
			return { from, options, filter: true };
		}
		const role = inside.slice(0, slash);
		const fieldStart = from + 1 + slash + 1;
		const options = (roleFields[role] ?? []).map((field) => ({
			label: field,
			type: 'property',
			apply: `${field}$`
		}));
		return { from: fieldStart, options, validFor: /^[\w]*$/ };
	}

	function collectDiagnostics(view: EditorView): Diagnostic[] {
		const text = view.state.doc.toString();
		const diagnostics: Diagnostic[] = [];
		const placeholder = /(?<!\\)\$([^$\n]*)\$/g;
		let match: RegExpExecArray | null;
		while ((match = placeholder.exec(text))) {
			const start = match.index;
			const end = start + match[0].length;
			const body = match[1];
			if (mode === 'display') {
				const colon = body.lastIndexOf(':');
				if (colon < 0) {
					diagnostics.push({ from: start, to: end, severity: 'error', message: 'Expected a variable scope and name, such as $target:character-variable:health$.' });
					continue;
				}
				const scope = body.slice(0, colon);
				const variable = body.slice(colon + 1);
				const variableScope = variableScopes.find(({ prefix }) => prefix === scope);
				const metadataScope = metadataScopes.find(({ prefix }) => prefix === scope);
				const allowedNames: readonly string[] = metadataScope ? metadataScope.values : variableScope ? getVariableNames(variableScope.source) : [];
				if (!variableScope && !metadataScope) {
					diagnostics.push({ from: start, to: end, severity: 'error', message: `Unknown variable scope "${scope}".` });
				} else if (!variable || !allowedNames.includes(variable)) {
					diagnostics.push({ from: start, to: end, severity: 'error', message: variable ? `Variable "${variable}" is not declared in ${scope}.` : `Choose a variable in ${scope}.` });
				}
			} else {
				const slash = body.indexOf('/');
				const role = slash < 0 ? '' : body.slice(0, slash);
				const field = slash < 0 ? '' : body.slice(slash + 1);
				if (!role || !Object.hasOwn(roleFields, role)) {
					diagnostics.push({ from: start, to: end, severity: 'error', message: role ? `Role "${role}" is not defined for this template.` : 'Choose a role and event field, such as $attack/damage$.' });
				} else if (!field || !roleFields[role].includes(field)) {
					diagnostics.push({ from: start, to: end, severity: 'error', message: field ? `Field "${field}" is not available from role "${role}".` : `Choose a field from role "${role}".` });
				}
			}
		}
		const openStart = unmatchedPlaceholderStart(text);
		if (openStart >= 0) {
			diagnostics.push({ from: openStart, to: text.length, severity: 'hint', message: 'Finish this placeholder with $.' });
		}
		return diagnostics;
	}

	onMount(() => {
		view = new EditorView({
			parent: mount,
			doc: value,
			extensions: [
				basicSetup,
				markdown(),
				interpolationHighlight,
				EditorView.contentAttributes.of({
					id,
					'aria-label': label ?? id,
					'aria-required': String(required),
					'aria-multiline': String(!singleLine),
					'data-testid': `input-${id}`,
					'class': 'def-input'
				}),
				...(singleLine ? [keymap.of([{ key: 'Enter', run: () => true }])] : []),
				autocompletion({ override: [complete], activateOnTyping: true }),
				linter(collectDiagnostics, { delay: 150 }),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) value = update.state.doc.toString();
				}),
				EditorView.theme({
					'&': { width: '100%', minHeight: '5.5rem', color: 'var(--text-color, #eee)', backgroundColor: 'var(--input-background, #151515)' },
					'.cm-content': { minHeight: '4.6rem', padding: '.55rem', fontFamily: 'inherit' },
					'.cm-line': { padding: '0' },
					'.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
					'.cm-variable-interpolation': { color: 'var(--color-accent)', fontWeight: '700', textDecoration: 'underline', textDecorationColor: 'var(--color-accent)', textUnderlineOffset: '2px' },
					'&.cm-focused': { outline: '2px solid var(--accent-color, #6d9eff)', outlineOffset: '1px' },
					'.cm-tooltip': { zIndex: '1000', color: '#f4f6f8', backgroundColor: '#20242a', border: '1px solid #657180', boxShadow: '0 3px 12px #0009' },
					'.cm-tooltip-lint .cm-diagnosticText': { color: '#f4f6f8', fontSize: '0.9rem', lineHeight: '1.4' },
					'.cm-tooltip-lint .cm-diagnostic': { padding: '.45rem .65rem' },
					'.cm-tooltip-autocomplete ul li': { color: '#f4f6f8', padding: '.25rem .5rem' },
					'.cm-tooltip-autocomplete ul li[aria-selected]': { color: '#fff', backgroundColor: '#245ea8' },
					'.cm-lintRange-error': { backgroundColor: '#ff5a5a22', textDecoration: 'underline wavy #ff7777' },
					'.cm-lintRange-hint': { backgroundColor: '#e4b64e22', textDecoration: 'underline dotted #f0c760' }
				}, { dark: true })
			]
		});
	});

	$effect(() => {
		const nextValue = value ?? '';
		if (view && view.state.doc.toString() !== nextValue) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextValue } });
		}
	});

	onDestroy(() => view?.destroy());
</script>

<BaseInput {id} {label} {wrapDiv}>
	<div class="editor-shell" bind:this={mount} data-required={required}></div>
</BaseInput>

<style>
	.editor-shell :global(.cm-editor) {
		box-sizing: border-box;
		border: 1px solid var(--border-color, #555);
		border-radius: 0.35rem;
	}
	.editor-shell :global(.cm-scroller) { overflow: auto; }
	.editor-shell :global(.cm-tooltip-autocomplete) { max-height: 14rem; }
</style>
