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
    import { createFormPopupFlow, type FormPopupTransition } from "$lib/shared/formPopupFlow";

    type CharacterForm = 'character' | 'label' | 'variable' | 'ai';

    let editor = getCurrentWorldEditor(page.params.worldName);
    let labelsInfo = $state(editor.getLabels());
    let characters = $state(editor.getCharacters());

    let charsList = $derived(characters.map((character) => ({
            Id: character.id,
            Name: character.name,
            Labels: character.labels?.join(', ') ?? '',
            Variables: character.vars.map((v) => `${v.name}`).join(', ')
    })));

    function createLabel(label: any = formFlow.data) {
        if(editor.getObject('label:'+label.name)){
            showError('Label '+label.name + ' already exists');
            return 'stay'
        }
        editor.addLabel(label.name,{description:label.description,title:label.title})
        labelsInfo = editor.getLabels();
        return 'back';
    }
    function createCharacter(character: Record<string,any> = formFlow.data): FormPopupTransition {
        
        if(character._baseOID){
            editor.updateObjectWithOid(character._baseOID,character);
            characters = editor.getCharacters();
            return 'close';
        }
        const newCharacter:Character = {
            id: character.id,
            name: character.name,
            labels: character.labels,
            controlledByPlayer:false,
            vars: []
        };
        if(editor.getObject('char:'+newCharacter.id)){
            showError('Character already exists');
            return 'stay';
        }
        editor.addCharacter(newCharacter);
        characters = editor.getCharacters();
        return 'close';
    }
    function setCharacterTitle(){
        return formFlow.data._baseOID ? 'Editing Character' : 'Create Character';
    }
    let formFlow = $state(createFormPopupFlow<CharacterForm>('character', {
        character: {
            title: setCharacterTitle,
            onSubmit: () => createCharacter()
        },
        label: {
            title: 'New Label',
            parent: 'character',
            onSubmit: createLabel
        },
        variable: { title: 'New Variable', parent: 'character' },
        ai: { title: 'Configure AI', parent: 'character' }
    }));
    let data = $derived(formFlow.data);
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
            data = $state.snapshot(character);
            formFlow.open('character',data);
            data._baseOID = character.oid;
        }}
        onDelete={(character) => {
            editor.deleteObject(character.oid as string);
            characters = editor.getCharacters();
        }}/>
    <div class="btn-create">
        <button onclick={()=>{
            formFlow.open('character');}}>Add Character</button>
    </div>
</div>
<FormPopup
    open={formFlow.isOpen}
    title={formFlow.title}
    onClose={() => formFlow.dismiss()}
    onCancel={() => formFlow.cancel()}
    onSubmit={() => formFlow.submit()}>

    {#if formFlow.activeForm === 'label'}
        <InputText id="labelName"  label="Name(id)" bind:value={data.name} wrapDiv required/>
        <InputText id="labelTitle" label="Title" bind:value={data.title} wrapDiv />
        <InputText id="labelDesc" label="Description" bind:value={data.description} wrapDiv/>
    {:else if formFlow.activeForm === 'character'}
        <InputText id="charId" label="ID" bind:value={data.id} wrapDiv required />
        <InputText id="charName" label="Name" bind:value={data.name} wrapDiv required />
        <InputCard id="charLabels" label="Labels" items={labelsInfo.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={data.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={()=>{
                formFlow.enter('label');
            }}>Create Label</button>
        </BaseInput>
        <BaseInput id='variable-list' wrapDiv>
            {@const varsList =data.vars ?  formFlow.data.vars.map((e:VariableDeclarator)=>{
                return {Name:e.name,Type:e.type,Value:e.value,'Has Display':e.display != undefined}}) : []}
            <h3>Variables</h3>
            {#if varsList.length > 0}
            <ObjectTable
                items={varsList}
                ref={data.vars}
                headers={['Name','Type','Value','Has Display']}
                onEdit={()=>{}}
                onDelete={(v)=>{
                    data.vars = data.vars.filter((e:VariableDeclarator)=>e.name !=v.name);
                }}
            />
            {:else}
            <p>No Variables</p>
            {/if}
            <BaseInput id='create-var' wrapDiv>
                <button type="button" onclick={()=>{
                    formFlow.enter('variable');
                }}>New Variable</button>
            </BaseInput>
        </BaseInput>

    {:else if formFlow.activeForm === 'variable'}
        <p>Variable editor coming soon.</p>
    {:else if formFlow.activeForm === 'ai'}
        <p>AI editor coming soon.</p>
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
