<script lang="ts">
    import type { ContextFrame, ContextStack } from "$lib/shared/contextStack.svelte";
    import { type CtxBuilder } from "$lib/shared/getterCtx";
    import type { EffectFomAction, VariableModify } from "$lib/types/data/declarative";
    import CopyPasteData from "../forms/CopyPasteData.svelte";
    import FormEffect from "../forms/FormEffect.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: EffectFomAction[];
        stack?: ContextStack;
        onEdit?: (value: EffectFomAction, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: EffectFomAction) => void;
        onCreatePressed?: () => void;
        ctx?:CtxBuilder
    }

    let {
        values = $bindable<EffectFomAction[]>([]),
        stack,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed,
        ctx
    }: Props = $props();

    let items = $state<EffectFomAction[]>([]);
    let tempVarsWithPosition = $state<{varName:string,index:number}[]>([]);
    $effect(() => {
        const incoming = values ?? [];
        if (JSON.stringify($state.snapshot(items)) === JSON.stringify(incoming)) {
            return;
        }
        items = incoming;
        let temps:{varName:string,index:number}[] = [];
        incoming.forEach((e,i)=>{
            if(e.type != 'setter')return;
            if(e.var.in != 'temp-variable')return
            temps.push({varName:e.var.variable,index:i});
        });
        tempVarsWithPosition = [...tempVarsWithPosition,...temps];
    });

    function setItems(next: EffectFomAction[]) {
        items = next;
        values = next;
    }
    function newCtx(tempVars:string[]):CtxBuilder|undefined{
        if(!ctx)return undefined;
        return {
            allowedGetters:ctx.allowedGetters,
            editor:ctx.editor,
            tempVars:tempVars,
            allowedObjects:ctx.allowedObjects,
            actionCategories:ctx.actionCategories,
            selfMetadata:ctx.selfMetadata,
            selfVars:ctx.selfVars
        }
    }

    async function handleStackCreate() {
        if (!stack) return;
        
        let localCtx = newCtx(tempVarsWithPosition.map(e => e.varName));
        const result = await stack.push<EffectFomAction, EffectFomAction>({
            title: 'Add Effect',
            data: { type: 'event', event: '' },
            meta:{mode:'create',ctx:localCtx},
            render: renderEffectForm
        });
        if (result) {
            if(result.type === 'setter' && 
            result.var.in === 'temp-variable' && 
            !tempVarsWithPosition.some((e)=>e.varName === result.var.variable)){
                tempVarsWithPosition.push({varName:result.var.variable,index:items.length});
            }
            setItems([...items, result]);
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }

    async function handleStackEdit(effect: EffectFomAction, index: number) {
        if (!stack) return;
        let localCtx = newCtx(tempVarsWithPosition.filter(e => e.index <= index).map(e => e.varName));

        if(effect.type === 'setter' && effect.var.in === 'temp-variable'){
            tempVarsWithPosition = tempVarsWithPosition.filter(e => e.varName != effect.var.variable);
        }
        const result = await stack.push<EffectFomAction, EffectFomAction>({
            title: `Edit Effect (${(new DOMParser()).parseFromString(label(effect), 'text/html').body.textContent})`,
            data: $state.snapshot(effect),
            meta:{mode:'edit',ctx:localCtx},
            render: renderEffectForm
        });
        if (result) {
            if(result.type === 'setter' && 
                result.var.in === 'temp-variable' && 
                !tempVarsWithPosition.some((e)=>e.varName === result.var.variable)
            ){
                tempVarsWithPosition.push({varName:result.var.variable,index:items.length});
            }
            const next = [...items];
            next[index] = result;
            setItems(next);
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }

    function addEffect() {
        if (stack) {
            handleStackCreate();
            return;
        }
        onCreatePressed?.();
    }

    function editEffect(effect: EffectFomAction, index: number) {
        if (stack) {
            handleStackEdit(effect, index);
            return;
        }
        onEdit?.(effect, index);
    }

    function deleteEffect() {
        // OrderedList has already updated its bound `items` array before
        // calling onDelete, so only sync the new list back to the component value.
        values = items;
    }

    function reorderEffects(next: EffectFomAction[]) {
        items = next;
        values = next;
    }

    function label(effect: EffectFomAction): string {
        function accent(text:string){
            return `<span style="color:var(--color-accent)">${text}</span>`
        }
        switch (effect.type) {
            case 'move':
                let toId = effect.toId;
                if(typeof toId === 'object'){
                    toId = `${toId.in}:${toId.variable}`
                }
                return `${accent('Move character')} To ${toId}`;
            case 'event':
                return `${accent('Event')} ${effect.event || '(unnamed)'} ${effect.data ?'with data: '+ Object.keys(effect.data).join(',') : ''}`;
            case 'conditional':
                return `${accent('Conditional')} (${effect.onTrue.length} true / ${effect.onFalse?.length ?? 0} false effects)`;
            case 'setter':
                const OPTS:Record<VariableModify['mode'],string> = {
                     decrement:'-=',
                     divide:'/=',
                     increment:'+=',
                     multiply:'*=',
                     set:'='
                }
                let varToSet = `${accent('SET')} ${effect.var.in}:${effect.var.variable} ${accent(OPTS[effect.mode])} `;
                if(typeof effect.value === 'object'){

                    if(effect.value.type === 'getter'){
                        return varToSet +`${effect.value.in}:${effect.value.variable}`;
                    }
                    if(effect.value.type === 'random-interval'){
                        return varToSet + `RANDOM(${effect.value.min},${effect.value.max})`
                    }
                    if(effect.value.type === 'random-value'){
                        return varToSet + `ANY OF:${effect.value.values.join(',')}`
                    }
                }
                if(typeof effect.value === 'string'){
                    return `${varToSet}"${effect.value}"`
                }
                return varToSet + effect.value;
            case 'start-dialogue':
                return `${accent('Start Dialogue')} ${effect.dialogueId ?? effect.intent ?? '(unspecified)'}`;
        }
    }
</script>

{#snippet renderEffectForm(frame: ContextFrame)}
    <FormEffect
        ctx = {frame.meta?.ctx}
        stack={stack!}
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(effect) => frame.resolve(effect)}
    />
{/snippet}

<div class="effect-list form-group">
    <CopyPasteData name='list-effects' top={-17}
     onCopy={()=>items} onPaste={(e:any)=>{if(Array.isArray(e))values = e}}/>
    <OrderedList
        bind:values={items}
        getLabel={label}
        onEdit={stack || onEdit ? editEffect : undefined}
        onDelete={deleteEffect}
        onReorder={reorderEffects}
        emptyText="No effects yet. Add an effect to start."
    />
    <button type="button" class="add-button" onclick={addEffect}>Add Effect</button>
</div>

<style>
    .effect-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border: 3px solid var(--border-default);
    }
    .add-button {
        align-self: flex-start;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.6rem;
        cursor: pointer;
    }
    .add-button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>
