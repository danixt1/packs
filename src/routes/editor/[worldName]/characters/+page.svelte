<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import InputText from "$lib/components/inputs/InputText.svelte";
    import InputCard from "$lib/components/inputs/InputCard.svelte";
    import { showError } from "$lib/notify";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    import type { Character, VariableDeclarator } from "$lib/types/data/declarative";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let labelsInfo = $state(editor.getLabels());
    let characters = $state(editor.getCharacters());

    let charsList = $derived(characters.map((character) => ({
            Id: character.id,
            Name: character.name,
            Labels: character.labels?.join(', ') ?? '',
            Variables: character.vars.map((v) => `${v.name}`).join(', ')
    })));
    let openObjectEditor = $state(false);
    //TODO make a state manager.
    let showLabelForm = $state(false);
    let showVarForm = $state(false);
    let keepEditorOpen = $state(false);

    let formTitle = $state('');
        
    let formCharacter = $state<Record<string, any>>({});
    let formLabel = $state<Record<string, any>>({});
    let currentCharId:string|null = $state(null);

    function onCancel(){
        if(showLabelForm){
            showLabelForm = false;
            return
        }
        openObjectEditor = false;
    }
    function formSubmit(){
        if(showLabelForm){
            createLabel(formLabel);
            showLabelForm = false;
            setTimeout(()=>{keepEditorOpen = false});
            return
        }
        createCharacter(formCharacter);
    }

    function createLabel(label: any) {
        editor.addLabel(label.name,{description:label.description,title:label.title})
        labelsInfo = editor.getLabels();
    }
    function buildBaseCharacterFormData() {
        formCharacter = {
            id: '',
            name: '',
            labels: [],
            vars: []
        };
    }
    function buildBaseLabelFormData(){
        formLabel = {
            name:'',
            title:'',
            description:''
        }
    }
    function createCharacter(character: Record<string,any>) {
        const newCharacter:Character = {
            id: character.id,
            name: character.name,
            labels: character.labels,
            controlledByPlayer:false,
            vars: []
        };
        if(currentCharId){
            editor.updateObjectWithOid(currentCharId,character);
            currentCharId = null;
            characters = editor.getCharacters();
            return;
        }
        if(editor.getObject('char:'+newCharacter.id)){
            showError('Character already exists');
            keepEditorOpen = true;
            setTimeout(()=>keepEditorOpen = false)
            return
        }
        editor.addCharacter(newCharacter);
        characters = editor.getCharacters();
    }

</script>
<div class="world-characters">
    <div>
        <h2>Characters</h2>
    </div>
    <ObjectTable
        bind:items={charsList}
        headers={['Id','Name', 'Labels', 'Variables']}
        ref = {characters}
        onEdit={(character) => {
            formTitle = 'Editing Character'
            
            formCharacter = $state.snapshot(character);
            
            currentCharId = character.oid as string;
            openObjectEditor = true;
        }}
        onDelete={(character) => {
            editor.deleteObject(character.oid as string);
            characters = editor.getCharacters();
        }}/>
    <div class="btn-create">
        <button onclick={()=>{
            formTitle = 'Create Character';
            buildBaseCharacterFormData();
            openObjectEditor = true}}>Add Character</button>
    </div>
</div>
<FormPopup
    bind:open={openObjectEditor}
    title={formTitle}
    onClose={() => { openObjectEditor = false; }}
    onCancel={onCancel}
    onSubmit={formSubmit}
    keepOpen={keepEditorOpen}>

    {#if showLabelForm}
        <InputText id="labelName"  label="Name(id)" bind:value={formLabel.name} wrapDiv required/>
        <InputText id="labelTitle" label="Title" bind:value={formLabel.title} wrapDiv />
        <InputText id="labelDesc" label="Description" bind:value={formLabel.description} wrapDiv/>
    {:else}
        <InputText id="charId" label="ID" bind:value={formCharacter.id} wrapDiv required />
        <InputText id="charName" label="Name" bind:value={formCharacter.name} wrapDiv required />
        <InputCard id="charLabels" label="Labels" items={labelsInfo.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={formCharacter.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={()=>{
                formTitle = "New Label";
                buildBaseLabelFormData();
                keepEditorOpen = true;
                showLabelForm = true;
            }}>Create Label</button>
        </BaseInput>
        {@const varsList =  formCharacter.vars.map((e:VariableDeclarator)=>{return {Name:e.name,Type:e.type,Value:e.value,'Has Display':e.display != undefined}})}
        <h3>Variables</h3>
        <ObjectTable
            items={varsList}
            ref={formCharacter.vars}
            headers={['Name','Type','Value','Has Display']}
            onEdit={()=>{}}
            onDelete={(v)=>{
                formCharacter.vars = formCharacter.vars.filter((e:VariableDeclarator)=>e.name !=v.name);
            }}
        />
        <BaseInput id='create-var' wrapDiv>
            <button type="button" onclick={()=>{
                formTitle = "New Variable";
                //TODO
            }}>New Variable</button>
        </BaseInput>
    {/if}
</FormPopup>
<style>
    .world-characters{
        display:flex;
        flex-direction:column;
        gap:1rem;
        padding:1rem;
        height: 100%;
        overflow: hidden;
    }
    .btn-create{
        display: flex;
        justify-content: center;
    }
    .btn-create button{
        height: 34px;
        width: 50%;
    }
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
