<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { showError } from "$lib/notify";
    import type { Character } from "$lib/types/data/declarative";
    import { createFormPopupFlow, type FormPopupTransition } from "$lib/shared/formPopupFlow";

    //Components
    import { InputText,InputCard } from "$lib/components/inputs";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    
    //Variable System Logic
    import { variableTitle, submitVariable } from "$lib/shared/variablesForm";
    import { VarList,VarInputs } from "$lib/components/editor/vars";

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
            labels: character.labels || [],
            controlledByPlayer:false,
            vars: character.vars || []
        };
        if(editor.getObject('char:'+newCharacter.id)){
            showError('Character already exists');
            return 'stay';
        }
        editor.addCharacter(newCharacter);
        characters = editor.getCharacters();
        return 'close';
    }
    let formFlow = $state(createFormPopupFlow<CharacterForm>('character', {
        character: {
            title: (e)=>e.data._baseOID ? 'Editing Character' : 'Create Character',
            onSubmit: () => createCharacter()
        },
        label: {
            title: 'New Label',
            parent: 'character',
            onSubmit: createLabel
        },
        variable: {
            title: (e)=>variableTitle(e, 'character'),
            parent: 'character',
            onSubmit: (e)=>submitVariable(e, 'character')
        },
        ai: { title: 'Configure AI', parent: 'character' }
    }));
    let data = $derived(formFlow.data);
</script>
<svelte:window onkeydown={(event) => { if (!formFlow.isOpen && event.key === 'n')formFlow.open('character') }} />
<EditorWrapper>
    <div>
        <h2>Characters</h2>
    </div>
    <ObjectTable
        bind:items={charsList}
        headers={['Id','Name', 'Labels', 'Variables']}
        ref = {characters}
        onEdit={(character) => {
            formFlow.enter('character',$state.snapshot(character));
            data._baseOID = character.oid;
        }}
        onDelete={(character) => {
            editor.deleteObject(character.oid as string);
            characters = editor.getCharacters();
        }}
    />
    <ButtonEditorCreate text="Add Character" onClick={()=>{
        formFlow.open('character');
    }}/>
</EditorWrapper>
<FormPopup {...formFlow.getFormPopupProperties()} >

    {#if formFlow.activeForm === 'label'}
        <InputText id="labelName"  label="Name(id)" bind:value={data.name} wrapDiv required autocomplete="off"/>
        <InputText id="labelTitle" label="Title" bind:value={data.title} wrapDiv autocomplete="off"/>
        <InputText id="labelDesc" label="Description" bind:value={data.description} wrapDiv autocomplete="off"/>
    {:else if formFlow.activeForm === 'character'}
        <InputText id="charId" label="ID" bind:value={data.id} wrapDiv required autocomplete="off" />
        <InputText id="charName" label="Name" bind:value={data.name} wrapDiv required autocomplete="off" />
        <InputCard id="charLabels" label="Labels" items={labelsInfo.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={data.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={()=>{
                formFlow.enter('label');
            }}>Create Label</button>
        </BaseInput>
        <VarList bind:formFlow={formFlow} withCreateButton />

    {:else if formFlow.activeForm === 'variable'}
        <VarInputs formFlow={formFlow} />
    {:else if formFlow.activeForm === 'ai'}
        <p>AI editor coming soon.</p>
    {/if}
</FormPopup>
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