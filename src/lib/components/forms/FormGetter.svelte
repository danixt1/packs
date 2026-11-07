<script lang="ts">
    import {InputSelect,InputText} from "$lib/components/inputs";
    import Form from "../Form.svelte";
    import CopyPasteData from "./CopyPasteData.svelte";
    import { createGetterFormLogic,type PropsFormGetter } from "./formGetterData.svelte";

    let {value = $bindable(),autoAttach = $bindable(),writeFormPropsTo=$bindable(),...props}:PropsFormGetter = $props();
    let g = $derived(createGetterFormLogic({...props,
        get writeFormPropsTo(){return writeFormPropsTo},
        set writeFormPropsTo(v){writeFormPropsTo = v},
        get value(){return value},
        set value(v){value = v},
        get autoAttach(){return autoAttach},
        set autoAttach(v){autoAttach = v}
    }));
</script>
{#snippet inputs()}
    <CopyPasteData onCopy = {()=>g.data} onPaste={(e)=>g.data = e} name='Getter'/>
    <div class="form-group base-data">
        <InputSelect {...g.getPropsIn()} />
        {#if g.hasTarget()}
            <InputSelect {...g.getPropsTarget()} />
        {/if}
        <InputSelect {...g.getPropsSlot()} />
    </div>
    <div class="form-group">
        {#if g.isMetadata()}
            <InputSelect {...g.getPropsMetadata()} />
        {/if}
        {#if g.isVariable()}
            <InputText {...g.getPropsVariable()} />
            <InputText {...g.getPropsFallback()} />
        {/if}
    </div>
{/snippet}
{#if writeFormPropsTo}
    {@render inputs()}
{:else}
    <Form onSubmit={g.submit} onCancel={props.onCancel}>
        {@render inputs()}
    </Form>
{/if}
<style>
    .base-data{
        display: flex;
        flex-direction: row;
    }
</style>
