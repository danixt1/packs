<script lang="ts">
    import CreateLabelPopup, { type NewLabel } from "$lib/components/CreateLabelPopup.svelte";
    import Input from "$lib/components/Input.svelte";

    //TODO: add the data when the editor backend is ready.
    let tempData =$state({
        labelsDetails:[
            {
                name:'npc',
                description:'is a Non-player character',
                usedBy:[
                    {
                        type:'dialogue',
                        mappingId:'dial.small-talk-npc',
                        id:'small-talk-npc',
                        name:'NPC Small Talk',
                        priority:'low' // pre-process priority in backend to determine UI order and colors.
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
            }
        ]
    })

    let labelPopupOpen = $state(false);
    let characterIdForNewLabel = $state<string | null>(null);

    function hasLabel(character: typeof tempData.characters[number], labelName: string) {
        return character.labels.includes(labelName);
    }

    function toggleLabel(character: typeof tempData.characters[number], labelName: string) {
        if (hasLabel(character, labelName)) {
            character.labels = character.labels.filter((label) => label !== labelName);
            return;
        }
        character.labels = [...character.labels, labelName];
    }

    function deleteLabel(labelName: string) {
        tempData.labelsDetails = tempData.labelsDetails.filter((label) => label.name !== labelName);
        for (const character of tempData.characters) {
            character.labels = character.labels.filter((label) => label !== labelName);
        }
    }

    function openCreateLabel(characterId: string) {
        characterIdForNewLabel = characterId;
        labelPopupOpen = true;
    }

    function createLabel(label: NewLabel) {
        tempData.labelsDetails.push({ name: label.name, description: label.description, usedBy: [] });
        const character = tempData.characters.find((candidate) => candidate.id === characterIdForNewLabel);
        if (character && !hasLabel(character, label.name)) {
            character.labels = [...character.labels, label.name];
        }
        characterIdForNewLabel = null;
    }

</script>
<div class="world-characters">
    <h2>Characters</h2>
    <div class="characters-list">
        {#each tempData.characters as character}
            <div class="character-card">
                <div>
                    <Input type='text-title' name="charName" bind:value={character.name}/>
                </div>
                <div class="character-properties">
                    <Input type='text' name="charId" label="ID:" bind:value={character.id}/>
                </div>
                <section class="character-labels" aria-labelledby={'labels-' + character.id}>
                    <div class="labels-heading">
                        <h3 id={'labels-' + character.id}>Labels</h3>
                        <button type="button" class="new-label-button" onclick={() => openCreateLabel(character.id)}>New label</button>
                    </div>
                    <div class="label-chips" aria-label={'Labels for ' + character.name}>
                        {#each tempData.labelsDetails as label}
                            <div class="label-option">
                                <button
                                    type="button"
                                    class:selected={hasLabel(character, label.name)}
                                    class="label-chip"
                                    aria-pressed={hasLabel(character, label.name)}
                                    title={label.description || label.name}
                                    onclick={() => toggleLabel(character, label.name)}
                                >
                                    {label.name}
                                </button>
                                <button
                                    type="button"
                                    class="delete-label-button"
                                    aria-label={'Delete label ' + label.name}
                                    title={'Delete label ' + label.name}
                                    onclick={() => deleteLabel(label.name)}
                                >
                                    &times;
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>
                <ul>
                    {#each character.vars as variable}
                        <li>{variable.name}: {variable.value}</li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</div>
<CreateLabelPopup
    bind:open={labelPopupOpen}
    existingLabelNames={tempData.labelsDetails.map((label) => label.name)}
    onCreate={createLabel}
/>
<style>
    .world-characters{
        display:flex;
        flex-direction:column;
        gap:1rem;
        padding:1rem;
    }
    .characters-list{
        display:flex;
        flex-direction:column;
        gap:1rem;
    }
    .character-card{
        border:1px solid var(--border-subtle);
        border-radius:6px;
        padding:0.5rem 1rem;
    }
    .character-properties{
        margin-top:5px
    }
    .character-labels{
        margin-top:1rem;
        padding-top:0.75rem;
        border-top:1px solid var(--border-subtle);
    }
    .labels-heading{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:0.75rem;
    }
    .labels-heading h3{
        margin:0;
        color:var(--color-accent-light);
        font-size:1rem;
    }
    .label-chips{
        display:flex;
        flex-wrap:wrap;
        gap:0.5rem;
        margin-top:0.65rem;
    }
    .label-option{
        position:relative;
    }
    .label-chip,.new-label-button,.delete-label-button{
        cursor:pointer;
        border:1px solid var(--border-subtle);
        padding:0.35rem 0.7rem;
        color:var(--color-text);
        background:var(--bg-card);
        font:inherit;
    }
    .label-chip,.new-label-button{
        border-radius:999px;
    }
    .label-option .label-chip{
        padding-right:2.35rem;
    }
    .delete-label-button{
        position:absolute;
        top:50%;
        right:0.2rem;
        z-index:1;
        display:grid;
        place-items:center;
        width:1.45rem;
        height:1.45rem;
        padding:0;
        border-radius:50%;
        transform:translateY(-50%);
        line-height:1;
    }
    .label-chip:hover,.new-label-button:hover,.delete-label-button:hover{
        background:var(--bg-card-hover);
        border-color:var(--color-accent);
    }
    .delete-label-button:hover{
        color:#e05555;
    }
    .label-chip.selected{
        color:var(--color-accent);
        background:var(--color-accent-light);
        border-color:var(--color-accent-light);
    }
    .label-option:has(.label-chip.selected) .delete-label-button{
        color:var(--color-accent);
        background:var(--color-accent-light);
        border-color:var(--color-accent-light);
    }
    .label-option:has(.label-chip.selected) .delete-label-button:hover{
        color:#e05555;
        background:var(--bg-card-hover);
        border-color:var(--color-accent);
    }
    .new-label-button{
        border-radius:4px;
        color:var(--color-accent-light);
    }
    .label-chip:focus-visible,.new-label-button:focus-visible,.delete-label-button:focus-visible{
        outline:2px solid var(--color-accent);
        outline-offset:2px;
    }
    @media (max-width:480px){
        .labels-heading{align-items:flex-start;flex-direction:column;}
    }
</style>
