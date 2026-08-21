<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import InputText from "$lib/components/inputs/InputText.svelte";
    import InputCard from "$lib/components/inputs/InputCard.svelte";
    import { showError } from "$lib/notify";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    let editor = getCurrentWorldEditor(page.params.worldName);
    //editor
    //TODO: add the data when the editor backend is ready.
    let tempData =$state({
        labelsDetails:[
            {
                name:'npc',
                title:'NPC' as string | undefined,
                description:'is a Non-player character',
                usedBy:[
                    {
                        type:'dialogue',
                        mappingId:'dial.small-talk-npc',
                        id:'small-talk-npc',
                        name:'NPC Small Talk',
                    }
                ]
            }
        ],
        characters:[
            {
                id:'char1',
                name:'Character 1',
                labels:['npc'],
                vars:[
                    {
                        id:'desc',
                        name:'Description',
                        type:'string',
                        value:'The first character in the world'
                    },
                    {
                        id:'health',
                        name:'Health',
                        type:'number',
                        min:0,
                        max:100,
                        value:100
                    }
                ]
                //TODO: autonomy
            },
            {
                id:'char2',
                name:'Character 2',
                labels:[],
                vars:[
                    {
                        id:'desc',
                        name:'Description',
                        type:'string',
                        value:'The second character in the world'
                    },
                    {
                        id:'health',
                        name:'Health',
                        type:'number',
                        min:0,
                        max:100,
                        value:80
                    }
                ]
            }
        ]
    })
    let charsList = $derived(tempData.characters.map((character) => ({
            Id: character.id,
            Name: character.name,
            Labels: character.labels.join(', '),
            Variables: character.vars.map((v) => `${v.name}`).join(', ')
    })));
    let openObjectEditor = $state(false);
    let keepEditorOpen = $state(false);

    let formTitle = $state('');
        
    let formCharacter = $state<Record<string, any>>({});
    let formLabel = $state<Record<string, any>>({});
    let showLabelForm = $state(false);
    let currentCharId:string|null = $state(null);

    function formSubmit(){
        if(showLabelForm){
            createLabel(formLabel);
            showLabelForm = false;
            setTimeout(()=>{keepEditorOpen = false});
            return
        }
        if(currentCharId === null){
            if(tempData.characters.some((e)=>e.id == formCharacter.id)){
                showError('The Passed ID already existed')
                setTimeout(()=>{openObjectEditor = true})
                return
            }
            createCharacter(formCharacter);
            return
        }
        const index = tempData.characters.findIndex((e)=>e.id == currentCharId);
        if(index <  0){
            showError('Failed Editing character, Original ID not found');
            return
        }
        tempData.characters[index] = formCharacter as any;
        currentCharId = null;
    }

    function createLabel(label: any) {
        tempData.labelsDetails.push({ name: label.name, description: label.description, usedBy: [], title: label.title });
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
        const newCharacter = {
            id: character.id,
            name: character.name,
            labels: character.labels,
            vars: []
        };
        tempData.characters.push(newCharacter);
    }

</script>
<div class="world-characters">
    <div>
        <h2>Characters</h2>
    </div>
    <ObjectTable
        bind:items={charsList}
        headers={['Id','Name', 'Labels', 'Variables']}
        ref = {tempData.characters}
        onEdit={(character) => {
            formTitle = 'Editing Character'
            
            formCharacter = $state.snapshot(character);
            
            currentCharId = character.id as string;
            openObjectEditor = true;
        }}
        onDelete={(character) => {
            tempData.characters = tempData.characters.filter((c) => c.id !== character.id);
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
    onSubmit={formSubmit}
    keepOpen={keepEditorOpen}>

    {#if showLabelForm}
        <InputText id="labelName"  label="Name(id)" bind:value={formLabel.name} wrapDiv required/>
        <InputText id="labelTitle" label="Title" bind:value={formLabel.title} wrapDiv />
        <InputText id="labelDesc" label="Description" bind:value={formLabel.description} wrapDiv/>
    {:else}
        <InputText id="charId" label="ID" bind:value={formCharacter.id} wrapDiv required />
        <InputText id="charName" label="Name" bind:value={formCharacter.name} wrapDiv required />
        <InputCard id="charLabels" label="Labels" items={tempData.labelsDetails.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={formCharacter.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={()=>{
                formTitle = "New Label";
                buildBaseCharacterFormData();
                keepEditorOpen = true;
                showLabelForm = true;
            }}>Create Label</button>
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
