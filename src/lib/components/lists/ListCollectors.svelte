<script lang="ts">
    import type { PageSwitch, Switch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import type { CollectorToGet } from "$lib/types/data/declarative";
    import FormCollector from "../forms/FormCollector.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: CollectorToGet[];
        switcher?: PageSwitch;
        page?: Switch;
        onCancel?: () => void;
        onAfterSubmit?: (value: CollectorToGet) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<CollectorToGet[]>([]),
        switcher = $bindable(),
        page,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    let formData = $state<CollectorToGet | undefined>();
    let editing = $state<number | null>(null);
    const pageSwitcher = page ?? (switcher ? switcher.createSwitch({ type: 'list', name: 'collector' }, 'collectors') : null);
    const ownsPageSwitcher = !page;

    onDestroy(() => {
        if (ownsPageSwitcher) pageSwitcher?.remove();
    });

    function describeCollector(value: CollectorToGet): string {
        if (value.target === 'self') return 'Self';
        if (value.target === 'connectedPlaces') return 'Connected places';
        return `Collect ${value.target}`;
    }

    function addCollector() {
        if (pageSwitcher) {
            editing = null;
            formData = { type: 'collector', target: 'character', collectIf: [] };
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function editCollector(value: CollectorToGet, index: number) {
        if (!pageSwitcher) return;
        editing = index;
        formData = $state.snapshot(value);
        pageSwitcher.enablePage();
    }

    function deleteCollector(_: CollectorToGet, index: number) {
        values = values.filter((__, valueIndex) => valueIndex !== index);
    }
</script>

{#if pageSwitcher && pageSwitcher.isPageEnabled}
    <FormCollector
        bind:value={formData}
        bind:writeFormPropsTo={pageSwitcher.localData.form}
        onCancel={() => {
            editing = null;
            onCancel?.();
        }}
        onAfterSubmit={(collector) => {
            const next = [...values];
            if (editing === null) next.push(collector);
            else next[editing] = collector;
            values = next;
            editing = null;
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
