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
    import InputSelect from "$lib/components/inputs/InputSelect.svelte";
    import InputNumber from "$lib/components/inputs/InputNumber.svelte";
    import InputSwitch from "$lib/components/inputs/InputSwitch.svelte";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";

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
    function setVariableFromForm(varData:Record<string,any> = formFlow.data): FormPopupTransition {
        let char = formFlow.getDataFromPanel('character');
        if(!char){
            showError('Reference character not found');
            return 'back';
        }
        let vars = char.vars || [];
        if(char._varRef){
            let index = vars.findIndex((v:VariableDeclarator)=>v.name == char._varRef);
            delete char._varRef;
            if(index >= 0){
                vars[index] = varData as VariableDeclarator;
            }else{
                showError('Variable not found');
                return 'back';
            }
        }else{
            if(vars.find((v:VariableDeclarator)=>v.name == varData.name)){
                showError('Variable with this name already exists');
                return 'stay';
            }
            vars.push(varData as VariableDeclarator);
        }
        char.vars = vars;
        return 'back';
    }
    function setCharacterTitle():string{
        return formFlow.data._baseOID ? 'Editing Character' : 'Create Character';
    }
    function setVariableTitle():string{
        return formFlow.data._varRef ? 'Editing Variable' : 'Create Variable';
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
        variable: {
            title: setVariableTitle,
            parent: 'character',
            onSubmit: setVariableFromForm
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
        }}/>
    <div class="btn-create">
        <button onclick={()=>{
            formFlow.open('character');}}>Add Character</button>
    </div>
</EditorWrapper>
<FormPopup
    open={formFlow.isOpen}
    title={formFlow.title}
    onClose={() => formFlow.dismiss()}
    onCancel={() => formFlow.cancel()}
    onSubmit={() => formFlow.submit()}>

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
        <BaseInput id='variable-list' wrapDiv>
            {@const varsList =data.vars ?  formFlow.data.vars.map((e:VariableDeclarator)=>{
                return {Name:e.name,Type:e.type,Value:e.value,'Has Display':e.display != undefined}}) : []}
            <h3>Variables</h3>
            {#if varsList.length > 0}
            <ObjectTable
                items={varsList}
                ref={data.vars}
                headers={['Name','Type','Value','Has Display']}
                onEdit={(v)=>{
                    data._varRef = v.name;
                    formFlow.enter('variable',$state.snapshot(v));
                }}
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
        <InputText id="varName" label="Name" bind:value={data.name} wrapDiv required autocomplete="off" />
        <InputSelect id="varType" label="Type" items={[
            {value:'string',title:'String'},
            {value:'number',title:'Number'},
            {value:'boolean',title:'Boolean'},
        ]} bind:selected={data.type} wrapDiv />
        {#if data.type === 'string'}
            <InputText id="varValue" label="Value" bind:value={data.value} wrapDiv autocomplete="off" />
        {:else if data.type === 'number'}
            <BaseInput id="varValues" wrapDiv>
                <table>
                    <thead>
                        <tr>
                            <th>Min</th>
                            <th>Actual</th>
                            <th>Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><InputNumber id="varMin"  bind:value={data.min} placeholder="Min(Not set)" /></td>
                            <td><InputNumber id="varValue" bind:value={data.value} placeholder="Actual" /></td>
                            <td><InputNumber id="varMax" bind:value={data.max} placeholder="Max(Not set)" /></td>
                        </tr>
                    </tbody>
                </table>
            </BaseInput>
        {:else if data.type === 'boolean'}
            <InputSwitch id="varValue" label="Activate?" bind:value={data.value} wrapDiv />
        {/if}
    {:else if formFlow.activeForm === 'ai'}
        <p>AI editor coming soon.</p>
    {/if}
</FormPopup>
<style>
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
