<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { PageSwitch, Switch } from "$lib/shared/pageSwitch";
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
        stack?: ContextStack;
        switcher?: PageSwitch;
        page?: Switch;
        onEdit?: (value: ConditionToken, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: ConditionToken) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<ConditionToken[]>([]),
        stack,
        switcher = $bindable(),
        page,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    const FORM_DATA_KEY = 'conditionFormData';
    const EDITING_KEY = 'conditionEditing';
    const pageSwitcher = page ?? (switcher ? switcher.createSwitch() : null);
    const ownsPageSwitcher = !page;
    let formData = $state<Record<string, any>>(pageSwitcher?.localData[FORM_DATA_KEY] ?? {});
    let editing = $state<number | null>(pageSwitcher?.localData[EDITING_KEY] ?? null);
    let activeForm = $state(Boolean(pageSwitcher?.localData[FORM_DATA_KEY]));

    onDestroy(() => {
        if (ownsPageSwitcher) pageSwitcher?.remove();
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
        return values ?? [];
    }

    function setItems(next: ConditionToken[]) {
        values = next;
    }

    async function handleStackCreate() {
        if (!stack) return;
        const condition = await stack.push<any, any>({
            title: 'Add Condition',
            data: { type: 'condition-relational', operator: '==' },
            render: renderConditionForm
        });
        if (condition) {
            setItems([...tokens(), condition]);
            onAfterSubmit?.(condition);
        }
    }

    async function handleStackEdit(token: ConditionToken, index: number) {
        if (!stack || !isConditionObject(token)) return;
        const condition = await stack.push<any, any>({
            title: 'Edit Condition',
            data: $state.snapshot(token),
            render: renderConditionForm
        });
        if (condition) {
            const next = [...tokens()];
            next[index] = condition;
            setItems(next);
            onAfterSubmit?.(condition);
        }
    }

    function addCondition() {
        if (stack) {
            handleStackCreate();
            return;
        }
        if (pageSwitcher) {
            const nextFormData = { type: 'condition-relational', operator: '==' };
            pageSwitcher.localData[FORM_DATA_KEY] = nextFormData;
            pageSwitcher.localData[EDITING_KEY] = null;
            editing = null;
            formData = nextFormData;
            activeForm = true;
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function addToken(token: ConditionToken) {
        if (!canAppend(tokens(), token)) return;
        setItems([...tokens(), token]);
    }

    function editCondition(token: ConditionToken, index: number) {
        if (!isConditionObject(token)) return;
        if (stack) {
            handleStackEdit(token, index);
            return;
        }
        if (pageSwitcher) {
            const nextFormData = $state.snapshot(token);
            pageSwitcher.localData[FORM_DATA_KEY] = nextFormData;
            pageSwitcher.localData[EDITING_KEY] = index;
            editing = index;
            formData = nextFormData;
            activeForm = true;
            pageSwitcher.enablePage();
            return;
        }
        onEdit?.(token, index);
    }

    function clearPendingEdit() {
        if (!pageSwitcher) return;
        delete pageSwitcher.localData[FORM_DATA_KEY];
        delete pageSwitcher.localData[EDITING_KEY];
    }

</script>

{#snippet renderConditionForm(frame: any)}
    <FormCondition
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(condition) => frame.resolve(condition)}
    />
{/snippet}

{#if activeForm && pageSwitcher}
    <FormCondition
        bind:value={formData}
        bind:autoAttach={formData}
        attachTo="condition"
        bind:writeFormPropsTo={pageSwitcher.localData.form}
        onCancel={() => {
            clearPendingEdit();
            editing = null;
            formData = {};
            activeForm = false;
            onCancel?.();
        }}
        onAfterSubmit={(condition) => {
            const index = editing;
            const next = [...tokens()];
            if (typeof index === 'number') {
                next[index] = condition;
            } else {
                next.push(condition);
            }
            setItems(next);
            clearPendingEdit();
            editing = null;
            formData = {};
            activeForm = false;
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
            bind:values={values}
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
