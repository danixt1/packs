<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { PageSwitch, Switch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import type { CollectorToGet } from "$lib/types/data/declarative";
    import FormCollector from "../forms/FormCollector.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: CollectorToGet[];
        stack?: ContextStack;
        switcher?: PageSwitch;
        page?: Switch;
        onCancel?: () => void;
        onAfterSubmit?: (value: CollectorToGet) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<CollectorToGet[]>([]),
        stack,
        switcher = $bindable(),
        page,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    const FORM_DATA_KEY = 'collectorFormData';
    const EDITING_KEY = 'collectorEditing';
    const pageSwitcher = page ?? (switcher ? switcher.createSwitch({ type: 'list', name: 'collector' }, 'collectors') : null);
    const ownsPageSwitcher = !page;
    let formData = $state<CollectorToGet | undefined>(pageSwitcher?.localData[FORM_DATA_KEY]);
    let editing = $state<number | null>(pageSwitcher?.localData[EDITING_KEY] ?? null);

    onDestroy(() => {
        if (ownsPageSwitcher) pageSwitcher?.remove();
    });

    function describeCollector(value: CollectorToGet): string {
        if (value.target === 'self') return 'Self';
        if (value.target === 'connectedPlaces') return 'Connected places';
        return `Collect ${value.target}`;
    }

    function setPendingEdit(nextFormData: CollectorToGet, nextEditing: number | null) {
        formData = nextFormData;
        editing = nextEditing;
        if (!pageSwitcher) return;
        pageSwitcher.localData[FORM_DATA_KEY] = nextFormData;
        pageSwitcher.localData[EDITING_KEY] = nextEditing;
    }

    function clearPendingEdit() {
        if (!pageSwitcher) return;
        delete pageSwitcher.localData[FORM_DATA_KEY];
        delete pageSwitcher.localData[EDITING_KEY];
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
        }
    }

    function addCollector() {
        if (stack) {
            handleStackCreate();
            return;
        }
        if (pageSwitcher) {
            setPendingEdit({ type: 'collector', target: 'character', collectIf: [] }, null);
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function editCollector(value: CollectorToGet, index: number) {
        if (stack) {
            handleStackEdit(value, index);
            return;
        }
        if (!pageSwitcher) return;
        setPendingEdit($state.snapshot(value), index);
        pageSwitcher.enablePage();
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

{#if pageSwitcher && pageSwitcher.isPageEnabled}
    <FormCollector
        bind:value={formData}
        bind:writeFormPropsTo={pageSwitcher.localData.form}
        onCancel={() => {
            editing = null;
            clearPendingEdit();
            onCancel?.();
        }}
        onAfterSubmit={(collector) => {
            const next = [...values];
            if (editing === null) next.push(collector);
            else next[editing] = collector;
            values = next;
            editing = null;
            clearPendingEdit();
            onAfterSubmit?.(collector);
        }}
    />
{:else}
    <div class="collector-list">
        <OrderedList
            bind:values={values}
            getLabel={describeCollector}
            onEdit={editCollector}
            onDelete={deleteCollector}
            emptyText="No collectors yet. Add a target collector to start."
        />
        <button type="button" class="add-button" onclick={addCollector}>Add Collector</button>
    </div>
{/if}

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
