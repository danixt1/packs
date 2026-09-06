<script lang="ts" generics="FormId extends string">
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";
    import type { VariableDeclarator } from "$lib/types/data/declarative";

    interface Props<FormId extends string>{
        formFlow:"variable" extends FormId ? FormPopupFlow<FormId> : never;
        withCreateButton?:boolean;
    }

    let { formFlow = $bindable(), withCreateButton }: Props<FormId> = $props();
    let varList = $derived((formFlow.data.vars ?? []).map((v:VariableDeclarator) => {
        return {   
            Name: v.name,
            Type: v.type,
            Value: v.value
        }
    }));
</script>
<div class="form-group">
    <h3>Variables</h3>
    {#if varList.length === 0}
        <p>No variables to show.</p>
    {:else}
        <ObjectTable  
            items={varList}
            headers={["Name", "Type", "Value"]}
            ref={formFlow.data.vars}
            onEdit={(v)=>{
                formFlow.data._varRef = v.name;
                formFlow.enter('variable' as FormId,$state.snapshot(v));
            }}
            onDelete={(v)=>{
                formFlow.data.vars = formFlow.data.vars.filter((e:VariableDeclarator)=>e.name !=v.name);
            }}
        />
    {/if}
    {#if withCreateButton}
        <button type="button" class="btn btn-primary" onclick={()=>{
            formFlow.enter('variable' as FormId);
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