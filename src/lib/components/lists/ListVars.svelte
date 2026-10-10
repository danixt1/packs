<script lang="ts">
    import type { Switch } from "$lib/shared/pageSwitch";
    import FormVar from "../forms/FormVar.svelte";
    import ObjectTable from "../ObjectTable.svelte";
    
    interface UseFormVar{
        onCancel?: () => void;
        onAfterSubmit?: (data:Record<string,any>) => void;
        switcher:Switch;
    }
    interface Props {
        values: Record<string,any>[];
        /** Only use that if is outside from a form*/
        formVar?: UseFormVar;
        /** What happens when clicking edit, adding formVar override that*/
        onEdit?: (v:Record<string,any>,index:number) => void;
        /** Insert the button create and call this variable when it's clicked, adding formVar override that*/
        onCreatePressed?:() => void;
    }
    let { values = $bindable(), onEdit, onCreatePressed, formVar }: Props = $props();
    if(values === undefined){
        values = [];
    }
    let editing = $state<null|number>(null);
</script>
<div class="form-group">
    {#if formVar && formVar.switcher.isPageEnabled}
        <FormVar onCancel={()=>{formVar?.onCancel?.()}} onAfterSubmit={(v)=>{
            if(editing !== null){
                values[editing] = v;
                editing = null;
            }else{
                values.push(v);
            }
            formVar?.onAfterSubmit?.(v);
        }} />
    {:else}
        <h3>Variables</h3>
        {#if values.length === 0}
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
                    editing = values.findIndex((e) => e.name === v.name);
                    if(formVar){
                        formVar.switcher.enablePage();
                    }else{
                        onEdit?.(v,editing);
                    }
                }}
                onDelete={(v)=>{
                    values = values.filter((e)=>e.name !=v.name);
                }}
            />
        {/if}
        {#if formVar || onCreatePressed}
            <button type="button" class="btn btn-primary" onclick={()=>{
                if(formVar){
                    formVar.switcher.enablePage();
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