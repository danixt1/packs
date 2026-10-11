<script lang="ts">
    import type { Switch } from "$lib/shared/pageSwitch";
    import FormVar from "../forms/FormVar.svelte";
    import ObjectTable from "../ObjectTable.svelte";

    interface Props {
        values: Record<string,any>[];
        switcher:Switch;
        /** What happens when clicking edit, adding `switcgher` invalidate that*/
        onEdit?: (v:Record<string,any>,index:number) => void;
        /** Works only with `switcher`*/
        onCancel?:() => void;
        /** Works only with `switcher`*/
        onAfterSubmit?:(data:Record<string,any>) => void;
        /** Insert the button create and call this variable when it's clicked, adding `switcher` invalidate that*/
        onCreatePressed?:() => void;
    }
    let { values = $bindable(), onEdit,onCancel,onAfterSubmit, onCreatePressed, switcher = $bindable()}: Props = $props();
    let formData = $state<Record<string,any>>({});
    let obj = $derived({vars:values})
    $effect(()=>{
        if(values === undefined){
            values = [];
        }
    })
    $effect(()=>{
        if(!switcher){
            return;
        }
        if(!switcher.localData.form){
            switcher.localData.form ={}
        }
    })
</script>
<div class="form-group">
    {#if switcher && switcher.isPageEnabled}
        <FormVar 
        bind:value={formData} 
        onCancel={()=>{onCancel?.()}} 
        bind:writeFormPropsTo={switcher.localData.form}
        autoAttach={obj}
        onAfterSubmit={(v)=>{
            onAfterSubmit?.(v);
            obj = {vars:values}
        }} />
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
                    if(switcher && editPos >= 0){
                        formData = {...$state.snapshot(v), _editing: editPos};
                        switcher.enablePage();
                    }else{
                        onEdit?.(v,editPos);
                    }
                }}
                onDelete={(v)=>{
                    values = values.filter((e)=>e.name !=v.name);
                }}
            />
        {/if}
        {#if switcher || onCreatePressed}
            <button type="button" class="btn btn-primary" onclick={()=>{
                if(switcher){
                    formData = {};
                    switcher.enablePage();
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