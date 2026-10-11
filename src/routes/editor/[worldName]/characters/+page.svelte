<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { showError } from "$lib/notify";
    import type { Character } from "$lib/types/data/declarative";

    //Components
    import { InputText,InputCard } from "$lib/components/inputs";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import Form from "$lib/components/Form.svelte";
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import Popup from "$lib/components/Popup.svelte";
    import ListVars from "$lib/components/lists/ListVars.svelte";
    import InputSwitch from "$lib/components/inputs/InputSwitch.svelte";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let labelsInfo = $state(editor.getLabels());
    let characters = $state(editor.getCharacters());

    let openPopup = $state(false);
    let data = $state<Record<string,any>>({});
    let labelData = $state<Record<string,any>>({});

    let switcher = $state(createPageSwitch());
    let pageSwitcher = (()=>switcher.createSwitch({form:{onSubmit:()=>createCharacter(),onCancel:()=>openPopup = false}}))();
    let labelSwtcher = (()=>switcher.createSwitch({form:{onSubmit:()=>createLabel(),onCancel:()=>pageSwitcher.enablePage()}}))()

    let charsList = $derived(characters.map((character) => ({
            Id: character.id,
            Name: character.name,
            Labels: character.labels?.join(', ') ?? '',
            Variables: character.vars.map((v) => `${v.name}`).join(', ')
    })));

    function createLabel(label: any = labelData) {
        if(editor.getObject('label:'+label.name)){
            showError('Label '+label.name + ' already exists');
            return;
        }
        editor.addLabel(label.name,{description:label.description,title:label.title})
        labelsInfo = editor.getLabels();
        pageSwitcher.enablePage();
    }
    function createCharacter(character: Record<string,any> = data) {
        
        if(character._baseOID){
            editor.updateObjectWithOid(character._baseOID,character);
            characters = editor.getCharacters();
            openPopup = false;
            return;
        }
        const newCharacter:Character = {
            id: character.id,
            name: character.name,
            labels: character.labels || [],
            controlledByPlayer:character.controlledByPlayer,
            vars: character.vars || []
        };
        if(editor.getObject('char:'+newCharacter.id)){
            showError('Character already exists');
            return;
        }
        editor.addCharacter(newCharacter);
        characters = editor.getCharacters();
        openPopup = false;
    }
</script>
<EditorWrapper>
    <div>
        <h2>Characters</h2>
    </div>
    <ObjectTable
        bind:items={charsList}
        headers={['Id','Name', 'Labels', 'Variables']}
        ref = {characters}
        onEdit={(character) => {
            data = $state.snapshot(character);
            data._baseOID = character.oid;
            openPopup = true;
        }}
        onDelete={(character) => {
            editor.deleteObject(character.oid as string);
            characters = editor.getCharacters();
        }}
    />
    <ButtonEditorCreate text="Add Character" onClick={()=>{
        data = {};
        openPopup = true;
    }}/>
</EditorWrapper>
<Popup open={openPopup} title={'Character'} > 
    <Form {...switcher.data.form} >
    {#if pageSwitcher.isPageEnabled}
        <InputText id="charId" label="ID" bind:value={data.id} wrapDiv required autocomplete="off" />
        <InputText id="charName" label="Name" bind:value={data.name} wrapDiv required autocomplete="off" />
        <InputSwitch id='controlledByPlayer' label="Controlled by player?" wrapDiv bind:value={data.controlledByPlayer} />
        <InputCard id="charLabels" label="Labels" items={labelsInfo.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={data.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={()=>{
                labelSwtcher.enablePage();
            }}>Create Label</button>
        </BaseInput>
    {/if}
    {#if !labelSwtcher.isPageEnabled}
        <ListVars switcher={switcher} bind:values={data.vars}
        onCancel={()=>pageSwitcher.enablePage()}
        onAfterSubmit={()=>pageSwitcher.enablePage()} />
    {/if}
    {#if labelSwtcher.isPageEnabled}
        <InputText id="labelName"  label="Name(id)" bind:value={labelData.name} wrapDiv required autocomplete="off"/>
        <InputText id="labelTitle" label="Title" bind:value={labelData.title} wrapDiv autocomplete="off"/>
        <InputText id="labelDesc" label="Description" bind:value={labelData.description} wrapDiv autocomplete="off"/>
    {/if}
    </Form>
</Popup>
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