<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';

    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import type { Item } from "$lib/types/data/declarative";
    import { showError } from "$lib/notify";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import { InputText, InputTextArea } from "$lib/components/inputs";
    import Form from "$lib/components/Form.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import ListVars from "$lib/components/lists/ListVars.svelte";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let items = $state(editor.getItems());
    
    let openPopup = $state(false);
    let switcher = $state(createPageSwitch());
    let pageSwitch = (()=>{return switcher.createSwitch({form:{
        onSubmit:()=>buildItem(),
        onCancel:()=>openPopup = false
    }})})();
    let data = $state<Record<string,any>>({});
    function buildItem(item: Record<string,any> = data) {
        if(item._baseOID){
            if(item._baseOID != 'item:'+item.id && editor.getObject('item:'+item.id)){
                showError('Id already used!');
                return;
            }
            editor.updateObjectWithOid(item._baseOID,item);
            items = editor.getItems();
            openPopup = false;
            return;
        }
        if(editor.getObject('item:'+item.id)){
            showError('Item already exists');
            return;
        }
        const newItem:Item = {
            id: item.id,
            name: item.name,
            description: item.description,
            vars: item.vars ?? []
        };
        editor.addItem(newItem);
        items = editor.getItems();
        openPopup = false;
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
            data = $state.snapshot(e);
            data._baseOID = e.oid;
            openPopup = true;}}
        onDelete={()=>{}}
        />
    {/if}
    <ButtonEditorCreate text="New Item" onClick={()=>{openPopup = true; data = {}}} />
</EditorWrapper>
<Popup open={openPopup} title='Items'>
    <Form {...switcher.data.form}>
        {#if pageSwitch.isPageEnabled}
            <InputText id="id" label="Id" bind:value={data.id} autocomplete='off' required wrapDiv/>
            <InputText id="name" label="Name" bind:value={data.name} autocomplete='off' required wrapDiv/>
            <InputTextArea id="description" label="Description" bind:value={data.description} wrapDiv/>
        {/if}
        <ListVars switcher={switcher} bind:values={data.vars} 
        onCancel={()=>{pageSwitch.enablePage()}}
        onAfterSubmit={()=>{pageSwitch.enablePage()}}/>
    </Form>
</Popup>
<style>
</style>