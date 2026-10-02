<script lang="ts" generics="FormId extends string">
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";
    import { showError } from "$lib/notify";
    import {
        canAppend,
        describeToken,
        isConditionObject,
        validateConditionalList,
        type ConditionToken
    } from "$lib/shared/conditionalList";

    interface Props<FormId extends string> {
        formFlow:"condition" extends FormId ? FormPopupFlow<FormId> : never;
    }
    let {formFlow}:Props<FormId> = $props();
    let data = $derived(formFlow.data);

    interface ListItem {
        id: number;
        token: ConditionToken;
    }

    let nextId = 0;
    let items = $state<ListItem[]>([]);
    let dragIndex = $state<number | null>(null);
    let overIndex = $state<number | null>(null);

    // Initialize from existing conditions once.
    $effect(() => {
        const existing = (data.conditions ?? []) as ConditionToken[];
        if (items.length === 0 && existing.length) {
            items = existing.map((token) => ({ id: nextId++, token }));
        }
    });

    // Keep the parent data in sync with the UI model.
    $effect(() => {
        data.conditions = items.map((item) => item.token);
    });

    function tokens(): ConditionToken[] {
        return items.map((item) => item.token);
    }

    function addCondition() {
        formFlow.enter('condition' as FormId, {
            _conditionIndex: null,
            type: 'condition-relational',
            operator: '=='
        });
    }

    function addToken(token: ConditionToken) {
        if (!canAppend(tokens(), token)) return;
        items = [...items, { id: nextId++, token }];
    }

    function editCondition(index: number) {
        const token = items[index].token;
        if (!isConditionObject(token)) return;
        formFlow.enter('condition' as FormId, {
            _conditionIndex: index,
            ...$state.snapshot(token)
        });
    }

    function removeToken(index: number) {
        const next = items.filter((_, i) => i !== index);
        if (!validateConditionalList(next.map((item) => item.token)).valid) {
            showError('Removing this would make the expression invalid.');
            return;
        }
        items = next;
    }

    function onDragStart(index: number, event: DragEvent) {
        dragIndex = index;
        event.dataTransfer?.setData('text/plain', String(index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(index: number, event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        overIndex = index;
    }

    function onDrop(index: number, event: DragEvent) {
        event.preventDefault();
        if (dragIndex === null || dragIndex === index) {
            dragIndex = null;
            overIndex = null;
            return;
        }
        const next = [...items];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(index, 0, moved);
        if (!validateConditionalList(next.map((item) => item.token)).valid) {
            showError('That order would make the expression invalid.');
            dragIndex = null;
            overIndex = null;
            return;
        }
        items = next;
        dragIndex = null;
        overIndex = null;
    }

    function onDragEnd() {
        dragIndex = null;
        overIndex = null;
    }
</script>

<div class="condition-list">
    <div class="toolbar">
        <button type="button" onclick={addCondition}>Add Condition</button>
        <button type="button" disabled={!canAppend(tokens(), 'AND')} onclick={() => addToken('AND')}>AND</button>
        <button type="button" disabled={!canAppend(tokens(), 'OR')} onclick={() => addToken('OR')}>OR</button>
        <button type="button" disabled={!canAppend(tokens(), 'NOT')} onclick={() => addToken('NOT')}>NOT</button>
        <button type="button" disabled={!canAppend(tokens(), '(')} onclick={() => addToken('(')}>(</button>
        <button type="button" disabled={!canAppend(tokens(), ')')} onclick={() => addToken(')')}>)</button>
    </div>

    {#if items.length === 0}
        <p class="empty">No conditions yet. Add a condition to start.</p>
    {:else}
        <ul class="tokens">
            {#each items as item, index (item.id)}
                <li
                    class="token"
                    class:dragging={dragIndex === index}
                    class:over={overIndex === index && dragIndex !== index}
                    draggable="true"
                    ondragstart={(event) => onDragStart(index, event)}
                    ondragover={(event) => onDragOver(index, event)}
                    ondrop={(event) => onDrop(index, event)}
                    ondragend={onDragEnd}
                >
                    <span class="grip" aria-hidden="true">⠿</span>
                    <span class="label">{describeToken(item.token)}</span>
                    <span class="actions">
                        {#if isConditionObject(item.token)}
                            <button type="button" onclick={() => editCondition(index)}>Edit</button>
                        {/if}
                        <button type="button" onclick={() => removeToken(index)}>Delete</button>
                    </span>
                </li>
            {/each}
        </ul>
    {/if}
</div>

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
    .empty {
        color: var(--color-text);
        opacity: 0.7;
        font-size: 0.9rem;
    }
    .tokens {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .token {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        background: var(--bg-panel-solid);
        transition: background-color 0.2s, border-color 0.2s;
    }
    .token.dragging {
        opacity: 0.5;
    }
    .token.over {
        border-color: var(--color-accent);
        background-color: var(--bg-card-hover);
    }
    .grip {
        cursor: grab;
        opacity: 0.5;
        user-select: none;
    }
    .label {
        flex: 1;
        font-size: 0.9rem;
        word-break: break-word;
    }
    .actions {
        display: flex;
        gap: 0.25rem;
    }
    .actions button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.15rem 0.45rem;
        cursor: pointer;
        font-size: 0.8rem;
    }
    .actions button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>