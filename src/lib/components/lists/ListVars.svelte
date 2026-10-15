<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { PageSwitch } from "$lib/shared/pageSwitch";
    import type { VariableDeclarator } from "$lib/types/data/declarative";
    import { onDestroy } from "svelte";
    import FormVar from "../forms/FormVar.svelte";
    import ObjectTable from "../ObjectTable.svelte";

    interface Props {
        values: Record<string,any>[];
        /** ContextStack is preferred for isolated, recursive stack navigation */
        stack?: ContextStack;
        /** Legacy switcher support for unmigrated routes */
        switcher?: PageSwitch;
        /** What happens when clicking edit, adding `switcher` or `stack` invalidates that */
        onEdit?: (v:Record<string,any>,index:number) => void;
        /** Works only with `switcher` */
        onCancel?:() => void;
        /** Works only with `switcher` */
        onAfterSubmit?:(data:Record<string,any>) => void;
        /** Insert the button create and call this variable when it's clicked */
        onCreatePressed?:() => void;
    }
    let {
        values = $bindable([]),
        stack,
        switcher = $bindable(),
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    let formData = $state<Record<string,any>>({});
    let editing = $state<number | null>(null);
    let obj = $derived({vars:values});
    let pageSwitcher = $state(switcher ? switcher.createSwitch() : null);

    onDestroy(()=>{
        pageSwitcher?.remove();
    });

    $effect(()=>{
        if(values === undefined){
            values = [];
        }
    });

    $effect(()=>{
        if(!pageSwitcher){
            return;
        }
        if(!pageSwitcher.localData.form){
            pageSwitcher.localData.form = {};
        }
    });

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
        }
    }
</script>

{#snippet renderVarForm(frame: any)}
    <FormVar
        bind:value={frame.draft}
        existingNames={frame.meta?.existingIds}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(v) => frame.resolve(v)}
    />
{/snippet}

<div class="form-group">
    {#if pageSwitcher && pageSwitcher.isPageEnabled}
        <FormVar 
            bind:value={formData} 
            editing={editing}
            onCancel={()=>{editing = null; onCancel?.()}} 
            bind:writeFormPropsTo={pageSwitcher.localData.form}
            autoAttach={obj}
            onAfterSubmit={(v)=>{
                onAfterSubmit?.(v);
                editing = null;
                obj = {vars:values}
            }}
        />
    {:else}
        <h3>Variables</h3>
        {#if !values || values.length === 0}
            <p>No variables to show.</p>
        {:else}
            <ObjectTable  
                items={values.map((v) => {
                    return {   
                        Name: v.name,
                        Type: v.type,
                        Value: v.type == 'string' ? `"${v.value}"` : v.value
                    }
                })}
                headers={["Name", "Type", "Value"]}
                ref={values}
                onEdit={(v)=>{
                    const editPos = values.findIndex((e) => e.name === v.name);
                    if (stack && editPos >= 0) {
                        handleStackEdit(editPos);
                    } else if (pageSwitcher && editPos >= 0) {
                        editing = editPos;
                        formData = $state.snapshot(v);
                        pageSwitcher.enablePage();
                    } else {
                        onEdit?.(v,editPos);
                    }
                }}
                onDelete={(v)=>{
                    values = values.filter((e)=>e.name !=v.name);
                }}
            />
        {/if}
        {#if stack || pageSwitcher || onCreatePressed}
            <button type="button" class="btn btn-primary" onclick={()=>{
                if (stack) {
                    handleStackCreate();
                    return;
                }
                if(pageSwitcher){
                    editing = null;
                    formData = {};
                    pageSwitcher.enablePage();
                    return;
                }
                if(onCreatePressed)onCreatePressed();
            }}>New Variable</button>
        {/if}
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