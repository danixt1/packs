<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';

    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { createFormPopupFlow, type FormPopupTransition } from "$lib/shared/formPopupFlow";
    import { variableTitle, submitVariable } from "$lib/shared/variablesForm";
    import type { Item } from "$lib/types/data/declarative";
    import { showError } from "$lib/notify";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import { InputText, InputTextArea } from "$lib/components/inputs";
    import { VarInputs } from "$lib/components/editor/vars";
    import VarList from "$lib/components/editor/vars/VarList.svelte";
    type ItemForm = 'item' | 'variable';
    let editor = getCurrentWorldEditor(page.params.worldName);
    let items = $state(editor.getItems());
    
    let formFlow = $state(createFormPopupFlow<ItemForm>('item', {
        item:{
            title:setItemTitle,
            onSubmit: ()=>buildItem(),
        },
        variable:{
            title: setVariableTitle,
            parent: 'item',
            onSubmit: setVariableFromForm,
        }
    }));
    function setItemTitle():string{
        return formFlow.data._baseOID ? `Edit Item` : 'Create Item';
    }
    function setVariableTitle():string{
        return variableTitle(formFlow, 'item');
    }
    function setVariableFromForm(): FormPopupTransition {
        return submitVariable(formFlow, 'item');
    }
    function buildItem(item: Record<string,any> = formFlow.data): FormPopupTransition {
        if(item._baseOID){
            editor.updateObjectWithOid(item._baseOID,item);
            items = editor.getItems();
            return 'close';
        }
        if(editor.getObject('item:'+item.id)){
            showError('Item already exists');
            return 'stay';
        }
        const newItem:Item = {
            id: item.id,
            name: item.name,
            description: item.description,
            vars: item.vars ?? []
        };
        editor.addItem(newItem);
        items = editor.getItems();
        return 'close';
    }
</script>
<EditorWrapper>
    <div>
        <h2>Items</h2>
    </div>
    {#if items.length === 0}
        <p>No items To Show.</p>
    {:else}
        {@const itemsList = items.map((item) => ({
            Id: item.id,
            Name: item.name,
            Description: item.description,
            Variables: item.vars.map((v) => `${v.name}`).join(', ')
        }))}
        <ObjectTable items={itemsList}
        headers={["Id", "Name", "Description", "Variables"]}
        ref={items}
        onEdit={(e)=>{
            formFlow.enter('item', $state.snapshot(e));formFlow.data._baseOID = e.oid}}
        onDelete={()=>{}}
        />
    {/if}
    <ButtonEditorCreate text="New Item" onClick={()=>formFlow.enter('item')} />
</EditorWrapper>
<FormPopup 
    open={formFlow.isOpen} 
    title={formFlow.title} 
    onClose={()=>formFlow.dismiss()}
    onCancel={()=>formFlow.cancel()}
    onSubmit={()=>formFlow.submit()}
>
    {#if formFlow.activeForm === 'item'}
        <InputText id="id" label="Id" bind:value={formFlow.data.id} required wrapDiv/>
        <InputText id="name" label="Name" bind:value={formFlow.data.name} required wrapDiv/>
        <InputTextArea id="description" label="Description" bind:value={formFlow.data.description} wrapDiv/>
        <VarList bind:formFlow={formFlow} withCreateButton />
    {:else if formFlow.activeForm === 'variable'}
        <VarInputs formFlow={formFlow} />
    {/if}

</FormPopup>
<style>
</style>