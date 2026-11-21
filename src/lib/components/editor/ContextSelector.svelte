<script lang="ts">
    import { onMount } from 'svelte';
    import InputMultipleItems, { type ItemSelection } from '$lib/components/inputs/InputMultipleItems.svelte';
    import type { WorldEditor } from '$lib/shared/worldEditor';
    import type { ContextEditing } from '$lib/types/data/editor';
    import { listenForWorldEditorContextsChanged, notifyWorldEditorContextsChanged } from '$lib/shared/worldEditorContextEvents';

    interface Props {
        editor: WorldEditor;
        worldId: string;
    }

    let { editor, worldId }: Props = $props();
    let contexts = $state.raw<ContextEditing[]>([]);
    let selected = $state<ItemSelection[]>([]);
    let isOpen = $state(false);

    let items = $derived(contexts.map((context) => ({
        name: context.name,
        parent: context.parent,
        title: context.title || context.name,
        parentTitle: context.parent || undefined
    })));
    let selectedLabels = $derived(selected.map((selection) => {
        const context = contexts.find((candidate) =>
            candidate.name === selection.name && candidate.parent === selection.parent
        );
        const label = context?.title || context?.name || selection.name;
        return selection.parent ? `${selection.parent.replaceAll('.', ' › ')} › ${label}` : label;
    }));

    $effect(() => {
        contexts = [...editor.getContexts()];
        selected = editor.getCurrentContexts().map(({ name, parent }) => ({ name, parent }));
    });

    onMount(() => listenForWorldEditorContextsChanged(worldId, () => {
        contexts = [...editor.getContexts()];
        selected = editor.getCurrentContexts().map(({ name, parent }) => ({ name, parent }));
    }));

    function updateSelection(value: ItemSelection[]) {
        selected = value;
        const selectedPaths = new Set(value.map(({ name, parent }) => parent ? `${parent}.${name}` : name));
        const currentContexts = editor.getContexts().filter((context) =>
            selectedPaths.has(context.parent ? `${context.parent}.${context.name}` : context.name)
        );

        editor.setCurrentContexts(currentContexts);
        notifyWorldEditorContextsChanged(worldId);
    }
</script>

<section class="context-selector" aria-label="Editor context filter">
    <button
        type="button"
        class="selector-toggle"
        aria-expanded={isOpen}
        aria-controls="editor-context-picker"
        disabled={contexts.length === 0}
        onclick={() => isOpen = !isOpen}
    >
        <span class="context-copy">
            <strong>Contexts</strong>
            {#if selectedLabels.length === 0}
                <span class="all-contexts">All contexts</span>
            {:else}
                <span class="selection-preview" aria-label={`${selected.length} contexts selected`}>
                    {#each selectedLabels.slice(0, 3) as label (label)}
                        <span class="selection-pill" title={label}>{label}</span>
                    {/each}
                    {#if selectedLabels.length > 3}
                        <span class="selection-more">+{selectedLabels.length - 3}</span>
                    {/if}
                </span>
            {/if}
        </span>
        <span class="toggle-indicator" aria-hidden="true">{isOpen ? 'Close' : 'Choose'} <span>{isOpen ? '⌃' : '⌄'}</span></span>
    </button>
    {#if isOpen && contexts.length}
        <div id="editor-context-picker" class="picker-panel">
            <InputMultipleItems
                id="editor-contexts"
                label="Search editor contexts"
                placeholder="Search contexts..."
                items={items}
                value={selected}
                onchange={updateSelection}
            />
        </div>
    {/if}
    {#if contexts.length === 0}
        <span class="empty-contexts">No contexts configured</span>
    {/if}
</section>

<style>
    .context-selector {
        padding: 0.35rem clamp(1rem, 3vw, 2rem);
        border-bottom: 1px solid var(--border-subtle);
        background: rgba(18, 20, 25, 0.32);
    }

    .selector-toggle {
        display: flex;
        width: 100%;
        min-height: 2.4rem;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid transparent;
        border-radius: 5px;
        background: transparent;
        color: var(--color-text);
        text-align: left;
        font: inherit;
        cursor: pointer;
    }

    .selector-toggle:hover:not(:disabled),
    .selector-toggle:focus-visible {
        border-color: var(--border-subtle);
        background: var(--bg-button);
        outline: none;
    }

    .selector-toggle:disabled {
        cursor: default;
    }

    .context-copy {
        display: flex;
        min-width: 0;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .selection-preview {
        display: flex;
        min-width: 0;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .selection-pill,
    .selection-more {
        max-width: 14rem;
        overflow: hidden;
        padding: 0.12rem 0.4rem;
        border: 1px solid var(--border-subtle);
        border-radius: 999px;
        background: var(--bg-button);
        color: var(--color-accent-light);
        font-size: 0.75rem;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .selection-more {
        flex-shrink: 0;
        color: var(--color-accent);
    }

    .all-contexts,
    .empty-contexts {
        margin: 0;
        color: var(--color-accent-dim);
        font-size: 0.85rem;
    }

    .toggle-indicator {
        flex-shrink: 0;
        color: var(--color-accent-dim);
        font-size: 0.8rem;
    }

    .toggle-indicator span {
        display: inline-block;
        width: 1rem;
        color: var(--color-accent);
        text-align: center;
    }

    .picker-panel {
        padding: 0.25rem 0.55rem 0.45rem;
    }
</style>
