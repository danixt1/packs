<script lang="ts">
    import InputMultipleItems, { type ItemSelection } from '$lib/components/inputs/InputMultipleItems.svelte';
    import type { ContextEditing } from '$lib/types/data/editor';

    interface Props {
        id: string;
        contexts: ContextEditing[];
        value: string[];
        label?: string;
        appliesTo?: 'objects'|'variables';
        onchange?: (value: string[]) => void;
    }

    let { id, contexts, value = $bindable([]), label = 'Contexts:', appliesTo, onchange }: Props = $props();

    let availableContexts = $derived(contexts.filter((context) => {
        const contextScope = context.appliesTo ?? 'both';
        return !appliesTo || contextScope === 'both' || contextScope === appliesTo;
    }));

    let items = $derived(availableContexts.map((context) => ({
        name: context.name,
        parent: context.parent,
        title: context.title || context.name,
        parentTitle: context.parent || undefined
    })));

    let selectedItems = $derived(value.flatMap((path) => {
        const context = availableContexts.find((candidate) => getPath(candidate) === path);
        return context ? [{ name: context.name, parent: context.parent }] : [];
    }));

    function getPath(context: ContextEditing) {
        return context.parent ? `${context.parent}.${context.name}` : context.name;
    }

    function updateSelection(selection: ItemSelection[]) {
        value = selection.map(({ name, parent }) => parent ? `${parent}.${name}` : name);
        onchange?.(value);
    }
</script>

{#if availableContexts.length}
    <label class="membership-label" for={`${id}-search`}>{label}</label>
    <InputMultipleItems
        {id}
        label={`Search ${label.toLowerCase()}`}
        placeholder="Search contexts..."
        {items}
        value={selectedItems}
        onchange={updateSelection}
    />
{:else}
    <p class="no-contexts">Create a context to assign this entry to it.</p>
{/if}

<style>
    .membership-label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 700;
    }
    .no-contexts {
        margin: 0;
        color: var(--color-accent-dim);
        font-size: 0.85rem;
    }
</style>
