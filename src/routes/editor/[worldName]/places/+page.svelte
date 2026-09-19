<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { createFormPopupFlow, type FormPopupTransition } from "$lib/shared/formPopupFlow";
    import type { Place } from "$lib/types/data/declarative";

    import { InputText, InputTextArea,InputCard } from "$lib/components/inputs";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { showError } from "$lib/notify";

    // Variable components
    import { variableTitle, submitVariable } from "$lib/shared/variablesForm";
    import { VarInputs,VarList } from "$lib/components/editor/vars";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let places = $state(editor.getPlaces());
    let formFlow = $state(createFormPopupFlow<'place'|'variable'>('place',{
        place:{
            title:(f)=>f.data._baseOID ? `Edit Place` : 'Create Place',
            onSubmit: ()=>buildPlace(),
        },
        variable:{
            title:(f)=>variableTitle(f,'place'),
            onSubmit:(f)=>submitVariable(f,'place')
        }
    }));

    const charactersInfo = editor.getCharacters().map((c) => {return {value:c.id,title:c.name}});
    function buildPlace(place: Record<string,any> = formFlow.data): FormPopupTransition {
        if(place._baseOID){
            editor.updateObjectWithOid(place._baseOID,place);
            places = editor.getPlaces();
            return 'close';
        }
        if(place.id.match(/[\s,'"]/)){
            showError('Id cannot have special characters and spaces');
            return 'stay';
        }
        if(editor.getObject('place:'+place.id)){
            showError('Place id Already exist');
            return 'stay';
        }
        const newPlace:Place = {
            id:place.id,
            charactersId:place.charactersId || [],
            connectedPlaces:place.connectedPlaces || [],
            description:place.description || '',
            name:place.name,
            vars:place.vars || []
        }
        editor.addPlace(newPlace);
        places = editor.getPlaces();
        return 'close';
    }
</script>

<EditorWrapper>
    <div>
        <h2>Places</h2>
    </div>
    {#if places.length == 0}
        <p>No Places to Show</p>
    {:else}
        {@const placesList = places.map((e)=>({
            Id:e.id,
            Name:e.name,
            'Connects To':e.connectedPlaces.join(', '),
            Description:e.description ? e.description.length > 70 ? e.description.substring(0,50) + '...' : e.description : '',
            Variables: e.vars.map((v) => `${v.name}`).join(', ')
        }))}
        <ObjectTable items={placesList}
        headers={['Id','Name','Connects To','Description','Variables']}
        ref={places}
        onEdit={(e)=>{
            formFlow.enter('place', $state.snapshot(e));formFlow.data._baseOID = e.oid
        }}
        onDelete={(e)=>{
            editor.deleteObject(e.oid as string);
            places = editor.getPlaces();
        }}
        />
    {/if}
    <ButtonEditorCreate text="New Place" onClick={()=>formFlow.open('place')} />
</EditorWrapper>

<FormPopup {...formFlow.getFormPopupProperties()}>
    {#if formFlow.activeForm === 'place'}
        <InputText id="place-id" label="Place ID" bind:value={formFlow.data.id} required wrapDiv autocomplete='off'/>
        <InputText id="place-name" label="Place Name" bind:value={formFlow.data.name} required wrapDiv autocomplete='off'/>
        <InputTextArea id="place-description" label="Description" bind:value={formFlow.data.description} wrapDiv />
        <InputCard id="place-characters" label="Characters In Place" bind:selectedItems={formFlow.data.charactersId} items={charactersInfo} wrapDiv />
        <InputCard id="connected-places" label="Connected Places" bind:selectedItems={formFlow.data.connectedPlacesId} items={places.map((p) => {return {value:p.id,title:p.name}})} wrapDiv />
        <VarList formFlow={formFlow} withCreateButton/>
    {:else}
        <VarInputs formFlow={formFlow}/>
    {/if}
</FormPopup>