<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import type { Place } from "$lib/types/data/declarative";

    import { InputText, InputTextArea,InputCard } from "$lib/components/inputs";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { showError } from "$lib/notify";

    import Popup from "$lib/components/Popup.svelte";
    import Form from "$lib/components/Form.svelte";
    import ListVars from "$lib/components/lists/ListVars.svelte";
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import FormVar from "$lib/components/forms/FormVar.svelte";

    let openPopup = $state(false);

    let placeData = $state<Record<string,any>>({});
    let varData = $state<Record<string,any>>({});
    let switcher = $state(createPageSwitch());
    let pageSwitch = $state(switcher.createSwitch());
    let varsSwitcher = $state(switcher.createSwitch());
    let editingVar:number|null = $state(null);
    let editor = getCurrentWorldEditor(page.params.worldName);
    let places = $state(editor.getPlaces());

    const charactersInfo = editor.getCharacters().map((c) => {return {value:c.id,title:c.name}});

    function buildPlace(place: Record<string,any> = placeData) {
        if(place._baseOID){
            editor.updateObjectWithOid(place._baseOID,place);
            places = editor.getPlaces();
            openPopup = false;
            return;
        }
        if(place.id.match(/[\s,'"]/)){
            showError('Id cannot have special characters and spaces');
            return;
        }
        if(editor.getObject('place:'+place.id)){
            showError('Place id Already exist');
            return;
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
        placeData = {};
        places = editor.getPlaces();
        openPopup = false;
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
            placeData = $state.snapshot(e);
            placeData._baseOID = e.oid;
            openPopup = true;
        }}
        onDelete={(e)=>{
            editor.deleteObject(e.oid as string);
            places = editor.getPlaces();
        }}
        />
    {/if}
    <ButtonEditorCreate text="New Place" onClick={()=>openPopup = true} />
</EditorWrapper>
<Popup title={'Items'} open={openPopup}>
    {#if pageSwitch.isPageEnabled}
        <Form onSubmit={()=>buildPlace()} onCancel={()=>openPopup = false} useWrapDiv>
            <InputText id="place-id" label="Place ID" bind:value={placeData.id} required autocomplete='off'/>
            <InputText id="place-name" label="Place Name" bind:value={placeData.name} required autocomplete='off'/>
            <InputTextArea id="place-description" label="Description" bind:value={placeData.description} />
            <InputCard id="place-characters" label="Characters In Place" bind:selectedItems={placeData.charactersId} items={charactersInfo} />
            <InputCard id="connected-places" label="Connected Places" bind:selectedItems={placeData.connectedPlaces} items={places.map((p) => {return {value:p.id,title:p.name}})} />
            <ListVars bind:values={placeData.vars}
            onEdit={(values,index)=>{varsSwitcher.enablePage();varData = $state.snapshot(values);editingVar=index}}
            onCreatePressed={()=>{varData = {};varsSwitcher.enablePage()}}/>
        </Form>
    {/if}
    {#if varsSwitcher.isPageEnabled}
        <FormVar value={varData} autoAttach={{attachTo:placeData,editingVar:editingVar,onFinish:()=>{editingVar=null;pageSwitch.enablePage()}}}
        onCancel={()=>{pageSwitch.enablePage()}}/>
    {/if}
</Popup>