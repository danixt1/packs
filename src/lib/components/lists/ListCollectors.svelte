<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { CollectorToGet } from "$lib/types/data/declarative";
    import FormCollector from "../forms/FormCollector.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: CollectorToGet[];
        stack?: ContextStack;
        onEdit?: (value: CollectorToGet, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: CollectorToGet) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<CollectorToGet[]>([]),
        stack,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    function describeCollector(value: CollectorToGet): string {
        if (value.target === 'self') return 'Self';
        if (value.target === 'connectedPlaces') return 'Connected places';
        return `Collect ${value.target}`;
    }

    async function handleStackCreate() {
        if (!stack) return;
        const result = await stack.push<CollectorToGet, CollectorToGet>({
            title: 'Add Collector',
            data: { type: 'collector', target: 'character', collectIf: [] },
            render: renderCollectorForm
        });
        if (result) {
            values = [...values, result];
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }

    async function handleStackEdit(value: CollectorToGet, index: number) {
        if (!stack) return;
        const result = await stack.push<CollectorToGet, CollectorToGet>({
            title: `Edit Collector (${describeCollector(value)})`,
            data: $state.snapshot(value),
            render: renderCollectorForm
        });
        if (result) {
            const next = [...values];
            next[index] = result;
            values = next;
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }

    function addCollector() {
        if (stack) {
            handleStackCreate();
            return;
        }
        onCreatePressed?.();
    }

    function editCollector(value: CollectorToGet, index: number) {
        if (stack) {
            handleStackEdit(value, index);
            return;
        }
        onEdit?.(value, index);
    }

    function deleteCollector(_: CollectorToGet, index: number) {
        values = values.filter((__, valueIndex) => valueIndex !== index);
    }
</script>

{#snippet renderCollectorForm(frame: any)}
    <FormCollector
        {stack}
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(collector) => frame.resolve(collector)}
    />
{/snippet}

<div class="collector-list">
    <OrderedList
        bind:values={values}
        getLabel={describeCollector}
        onEdit={stack || onEdit ? editCollector : undefined}
        onDelete={deleteCollector}
        emptyText="No collectors yet. Add a target collector to start."
    />
    <button type="button" class="add-button" onclick={addCollector}>Add Collector</button>
</div>

<style>
    .collector-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .add-button {
        align-self: flex-start;
        padding: 0.25rem 0.6rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }
    .add-button:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>
