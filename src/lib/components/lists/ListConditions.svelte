<script lang="ts">
    import type { ContextFrame, ContextStack } from "$lib/shared/contextStack.svelte";
    import FormCondition from "../forms/FormCondition.svelte";
    import OrderedList from "./OrderedList.svelte";
    import {
        describeToken,
        isConditionObject,
        type ConditionToken
    } from "$lib/shared/conditionalList";
    import { createGetterCtx, type CtxBuilder } from "$lib/shared/getterCtx";
    import CopyPasteData from "../forms/CopyPasteData.svelte";

    interface Props {
        values?: ConditionToken[];
        stack?: ContextStack;
        onEdit?: (value: ConditionToken, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: ConditionToken) => void;
        onCreatePressed?: () => void;
        ctx?:CtxBuilder
    }
    let {
        values = $bindable<ConditionToken[]>([]),
        stack,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed,
        ctx
    }: Props = $props();
    let getterCtx = $state(createGetterCtx());
    $effect(()=>{
        if(ctx){
            if(ctx.allowedGetters)getterCtx.setAllowedGetters(ctx.allowedGetters);
            if(ctx.allowedObjects)getterCtx.setAllowedObjects(ctx.allowedObjects);
            if(ctx.actionCategories)getterCtx.setCategories(ctx.actionCategories);
            if(ctx.selfMetadata)getterCtx.setSelfMetadata(ctx.selfMetadata);
            
            getterCtx.varsCallback((e)=>{
                if(e === 'character/place'){
                    e = 'place';
                }
                if(e === 'self'){
                    return ctx.selfVars ?? (ctx.selfMetadata
                     && ctx.selfMetadata != 'action' 
                     && ctx.selfMetadata != 'autonomy' ? ctx.editor.getVarsNameFrom(ctx.selfMetadata) : []);
                }
                if(e === 'temp'){
                    return ctx.tempVars ?? []
                }
                return ctx.editor.getVarsNameFrom(e);
            })
        }
    })

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
        } else {
            onCancel?.();
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
        } else {
            onCancel?.();
        }
    }

    function addCondition() {
        if (stack) {
            handleStackCreate();
            return;
        }
        onCreatePressed?.();
    }

    function addToken(token: ConditionToken) {
        setItems([...tokens(), token]);
    }

    function editCondition(token: ConditionToken, index: number) {
        if (!isConditionObject(token)) return;
        if (stack) {
            handleStackEdit(token, index);
            return;
        }
        onEdit?.(token, index);
    }
</script>

{#snippet renderConditionForm(frame: ContextFrame)}
    <FormCondition
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(condition) => frame.resolve(condition)}
        getterCtx = {getterCtx}
    />
{/snippet}

<div class="condition-list">
    <CopyPasteData top={10} name={'list-conditions'} onCopy={()=>values} onPaste={(e:any)=>values = e} />
    <div class="toolbar">
        <button type="button" onclick={addCondition}>Add Condition</button>
        <button type="button" onclick={() => addToken('AND')}>AND</button>
        <button type="button" onclick={() => addToken('OR')}>OR</button>
        <button type="button" onclick={() => addToken('NOT')}>NOT</button>
        <button type="button" onclick={() => addToken('(')}>(</button>
        <button type="button" onclick={() => addToken(')')}>)</button>
    </div>
    <OrderedList
        bind:values={values}
        getLabel={describeToken}
        onEdit={stack || onEdit ? editCondition : undefined}
        emptyText="No conditions yet. Add a condition to start."
    />
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
</style>
