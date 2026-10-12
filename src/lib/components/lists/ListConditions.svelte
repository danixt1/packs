<script lang="ts">
    import type { PageSwitch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import { showError } from "$lib/notify";
    import FormCondition from "../forms/FormCondition.svelte";
    import OrderedList from "./OrderedList.svelte";
    import {
        canAppend,
        describeToken,
        isConditionObject,
        validateConditionalList,
        type ConditionToken
    } from "$lib/shared/conditionalList";

    interface Props {
        values?: ConditionToken[];
        switcher?: PageSwitch;
        onEdit?: (value: ConditionToken, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: ConditionToken) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<ConditionToken[]>(),
        switcher = $bindable(),
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    let formData = $state<Record<string, any>>({});
    let editing = $state<number | null>(null);
    let pageSwitcher = $state(switcher ? switcher.createSwitch() : null);
    let items = $state<ConditionToken[]>([]);

    onDestroy(() => {
        pageSwitcher?.remove();
    });

    $effect(() => {
        const incoming = values ?? [];
        const current = items;
        if (JSON.stringify($state.snapshot(current)) === JSON.stringify(incoming)) {
            return;
        }
        items = incoming;
    });

    $effect(() => {
        if (!pageSwitcher) {
            return;
        }
        if (!pageSwitcher.localData.form) {
            pageSwitcher.localData.form = {};
        }
    });

    function tokens(): ConditionToken[] {
        return items;
    }

    function setItems(next: ConditionToken[]) {
        items = next;
        values = next;
    }

    function addCondition() {
        if (pageSwitcher) {
            editing = null;
            formData = { type: 'condition-relational', operator: '==' };
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function addToken(token: ConditionToken) {
        if (!canAppend(tokens(), token)) return;
        setItems([...items, token]);
    }

    function editCondition(token: ConditionToken, index: number) {
        if (!isConditionObject(token)) return;
        if (pageSwitcher) {
            editing = index;
            formData = $state.snapshot(token);
            pageSwitcher.enablePage();
            return;
        }
        onEdit?.(token, index);
    }

</script>

{#if pageSwitcher && pageSwitcher.isPageEnabled}
    <FormCondition
        bind:value={formData}
        bind:autoAttach={formData}
        attachTo="condition"
        bind:writeFormPropsTo={pageSwitcher.localData.form}
        onCancel={() => {
            editing = null;
            onCancel?.();
        }}
        onAfterSubmit={(condition) => {
            const index = editing;
            const next = [...items];
            if (typeof index === 'number') {
                    next[index] = condition;
            } else {
                    next.push(condition);
            }
            setItems(next);
            editing = null;
            onAfterSubmit?.(condition);
        }}
    />
{:else}
    <div class="condition-list">
        <div class="toolbar">
            <button type="button" onclick={addCondition}>Add Condition</button>
            <button type="button" disabled={!canAppend(tokens(), 'AND')} onclick={() => addToken('AND')}>AND</button>
            <button type="button" disabled={!canAppend(tokens(), 'OR')} onclick={() => addToken('OR')}>OR</button>
            <button type="button" disabled={!canAppend(tokens(), 'NOT')} onclick={() => addToken('NOT')}>NOT</button>
            <button type="button" disabled={!canAppend(tokens(), '(')} onclick={() => addToken('(')}>(</button>
            <button type="button" disabled={!canAppend(tokens(), ')')} onclick={() => addToken(')')}>)</button>
        </div>

        <OrderedList
            bind:values={items}
            getLabel={describeToken}
            onEdit={editCondition}
            validateChange={(next) => validateConditionalList(next).valid}
            onInvalidChange={showError}
            invalidChangeMessage="That change would make the expression invalid."
            emptyText="No conditions yet. Add a condition to start."
        />
    </div>
{/if}

<style>
    .condition-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }
    .toolbar button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.6rem;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .toolbar button:hover:not(:disabled) {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
    .toolbar button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>
