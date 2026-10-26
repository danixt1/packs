<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import type { VariableDeclarator } from "$lib/types/data/declarative";
    import CopyPasteData from "../forms/CopyPasteData.svelte";
    import FormVar from "../forms/FormVar.svelte";
    import ObjectTable from "../ObjectTable.svelte";

    interface Props {
        values: Record<string,any>[];
        /** ContextStack is preferred for isolated, recursive stack navigation */
        stack?: ContextStack;
        /** What happens when clicking edit without a ContextStack */
        onEdit?: (v:Record<string,any>,index:number) => void;
        onCancel?:() => void;
        onAfterSubmit?:(data:Record<string,any>) => void;
        /** Insert the button create and call this variable when it's clicked */
        onCreatePressed?:() => void;
        title?:string;
        suggestions?:string[];
    }
    let {
        values = $bindable([]),
        stack,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed,
        title = 'Variables',
        suggestions
    }: Props = $props();

    $effect(()=>{
        if(values === undefined){
            values = [];
        }
    });
    function accent(text:string){
        return `<span style="color:var(--color-accent)">${text}</span>`
    }
    async function handleStackCreate() {
        if (!stack) return;
        const result = await stack.push<Partial<VariableDeclarator>, VariableDeclarator>({
            title: 'New Variable',
            data: { name: '', type: 'string', value: '' },
            render: renderVarForm,
            meta: {
                mode: 'create',
                existingIds: values.map((v) => v.name)
            }
        });
        if (result) {
            values = [...values, result];
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }

    async function handleStackEdit(index: number) {
        if (!stack) return;
        const target = values[index];
        const result = await stack.push<VariableDeclarator, VariableDeclarator>({
            title: `Edit ${target.name}`,
            data: target as VariableDeclarator,
            render: renderVarForm,
            meta: {
                mode: 'edit',
                originalId: target.name,
                existingIds: values.filter((_, i) => i !== index).map((v) => v.name)
            }
        });
        if (result) {
            values = values.map((item, i) => (i === index ? result : item));
            onAfterSubmit?.(result);
        } else {
            onCancel?.();
        }
    }
</script>

{#snippet renderVarForm(frame: any)}
    <FormVar
        nameSuggestions={suggestions}
        bind:value={frame.draft}
        existingNames={frame.meta?.existingIds}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(v) => frame.resolve(v)}
    />
{/snippet}

<div class="form-group">
    <CopyPasteData name='var-list' top={45} onCopy={()=>values} onPaste={(e:any)=>values = e} />
    <h3>{title}</h3>
    {#if !values || values.length === 0}
        <p>No variables to show.</p>
    {:else}
        <ObjectTable
            items={values.map((v) => {
                const TYPE_VAR = {
                    'boolean':accent('bool:'),
                    'number':accent('num:'),
                    'string':accent('str:')
                }
                function makeCard(title:string){
                    return`
                    <span style="border:1px solid var(--border-default);font-size:small;padding:1px 3px;margin-right:2px">
                        ${title}
                    </span>
                    `
                }
                function tryToLoadCurrentEditor(){
                    try{
                        return getCurrentWorldEditor();
                    }catch{
                        return undefined;
                    }
                }
                let cards = '';
                let editor = tryToLoadCurrentEditor();
                let data = editor?.getVarsRelations(v.name) ?? [];
                let isUsed = false;
                let isModified = false;
                data?.forEach(e =>{
                    if(e.relation === 'modify'){
                        isModified = true;
                    }
                    if(e.relation === 'use'){
                        isUsed = true;
                    }
                })
                if(isUsed){
                    cards = makeCard('READ');
                }
                if(isModified){
                    cards+=makeCard('SET');
                }
                return {
                    //avoid separation in smarthphone because the display grid.
                    Name:{
                        type:'table-descriptor',
                        show:`<span>${TYPE_VAR[v.type as 'boolean'|'number'|'string']} ${v.name}</span>`,
                        orderString:v.name
                    },
                    Value: v.type == 'string' ? `"${v.value}"` : v.value,
                    Operations:cards ? `<span>${cards}</span>` : 'NONE'
                }
            })}
            headers={["Name","Operations" ,"Value"]}
            ref={values}
            onEdit={(v)=>{
                const editPos = values.findIndex((e) => e.name === v.name);
                if (stack && editPos >= 0) {
                    handleStackEdit(editPos);
                } else {
                    onEdit?.(v,editPos);
                }
            }}
            onDelete={(v)=>{
                values = values.filter((e)=>e.name !=v.name);
            }}
        />
    {/if}
    {#if stack || onCreatePressed}
        <button type="button" class="btn btn-primary" onclick={()=>{
            if (stack) {
                handleStackCreate();
                return;
            }
            onCreatePressed?.();
        }}>New Variable</button>
    {/if}
</div>
<style>
    button {
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>