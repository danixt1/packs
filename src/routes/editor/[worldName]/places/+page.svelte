<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import type { Place } from "$lib/types/data/declarative";

    import { InputText, InputTextArea, InputCard } from "$lib/components/inputs";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { showError, showSucess } from "$lib/notify";

    import Popup from "$lib/components/Popup.svelte";
    import Form from "$lib/components/Form.svelte";
    import ListVars from "$lib/components/lists/ListVars.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import { createContextStack } from "$lib/shared/contextStack.svelte";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let places = $state(editor.getPlaces());
    const charactersInfo = editor.getCharacters().map((c) => ({ value: c.id, title: c.name }));

    const stack = createContextStack();

    async function startCreate() {
        const newPlace = await stack.push<Partial<Place>, Place>({
            title: 'New Place',
            data: { id: '', name: '', description: '', charactersId: [], connectedPlaces: [], vars: [] },
            render: renderPlaceForm,
            meta: { mode: 'create' }
        });

        if (newPlace) {
            const cleanId = String(newPlace.id ?? '').trim();
            if (cleanId.match(/[\s,'"]/)) {
                showError('Id cannot have special characters and spaces');
                return;
            }
            if (editor.getObject('place:' + cleanId)) {
                showError('Place id Already exist');
                return;
            }
            editor.addPlace({
                id: cleanId,
                name: newPlace.name,
                description: newPlace.description || '',
                charactersId: newPlace.charactersId || [],
                connectedPlaces: newPlace.connectedPlaces || [],
                vars: newPlace.vars || []
            });
            places = editor.getPlaces();
            showSucess('Place created');
        }
    }

    async function startEdit(item: Record<string, any>) {
        const originalOid = item.oid as string;
        const target = $state.snapshot(item) as Place & { _baseOID?: string };
        target._baseOID = originalOid;

        const updated = await stack.push<Place & { _baseOID?: string }, Place & { _baseOID?: string }>({
            title: `Edit ${target.id}`,
            data: target,
            render: renderPlaceForm,
            meta: { mode: 'edit', originalId: target.id }
        });

        if (updated) {
            const cleanId = String(updated.id ?? '').trim();
            if (cleanId.match(/[\s,'"]/)) {
                showError('Id cannot have special characters and spaces');
                return;
            }
            const baseOid = updated._baseOID ?? originalOid;
            if (baseOid !== 'place:' + cleanId && editor.getObject('place:' + cleanId)) {
                showError('Place id Already exist');
                return;
            }
            delete updated._baseOID;
            editor.updateObjectWithOid(baseOid, updated);
            places = editor.getPlaces();
            showSucess('Place updated');
        }
    }

    function submitPlaceForm() {
        const frame = stack.current;
        if (!frame) return;

        const draft = frame.draft;
        const cleanId = String(draft.id ?? '').trim();
        if (!cleanId) {
            showError('Place ID is required');
            return;
        }
        if (cleanId.match(/[\s,'"]/)) {
            showError('Id cannot have special characters and spaces');
            return;
        }

        const isCreate = frame.meta?.mode === 'create';
        const targetOid = isCreate ? 'place:' + cleanId : (draft._baseOID ?? 'place:' + cleanId);

        if (isCreate && editor.getObject('place:' + cleanId)) {
            showError('Place id Already exist');
            return;
        }
        if (!isCreate && targetOid !== 'place:' + cleanId && editor.getObject('place:' + cleanId)) {
            showError('Place id Already exist');
            return;
        }

        frame.resolve({
            ...draft,
            id: cleanId,
            charactersId: draft.charactersId || [],
            connectedPlaces: draft.connectedPlaces || [],
            description: draft.description || '',
            vars: draft.vars || []
        });
    }

    function cancelPlaceForm() {
        stack.current?.cancel();
    }
</script>

{#snippet renderPlaceForm(frame: any)}
    <Form onSubmit={submitPlaceForm} onCancel={cancelPlaceForm}>
        <div class="form-group">
            <InputText id="place-id" label="Place ID" bind:value={frame.draft.id} required autocomplete='off'/>
            <InputText id="place-name" label="Place Name" bind:value={frame.draft.name} required autocomplete='off'/>
            <InputTextArea id="place-description" label="Description" bind:value={frame.draft.description} />
            <InputCard id="place-characters" label="Characters In Place" bind:selectedItems={frame.draft.charactersId} items={charactersInfo} />
            <InputCard id="connected-places" label="Connected Places" bind:selectedItems={frame.draft.connectedPlaces} items={places.map((p) => ({ value: p.id, title: p.name }))} />
            <ListVars {stack} bind:values={frame.draft.vars} />
        </div>
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Places</h2>
    </div>
    {#if places.length == 0}
        <p>No Places to Show</p>
    {:else}
        {@const placesList = places.map((e)=>({
            Id: e.id,
            Name: e.name,
            'Connects To': e.connectedPlaces.join(', '),
            Description: e.description ? (e.description.length > 70 ? e.description.substring(0, 50) + '...' : e.description) : '',
            Variables: (e.vars ?? []).map((v) => `${v.name}`).join(', ')
        }))}
        <ObjectTable
            items={placesList}
            headers={['Id','Name','Connects To','Description','Variables']}
            ref={places}
            onEdit={(e) => startEdit(e)}
            onDelete={(e) => {
                editor.deleteObject(e.oid as string);
                places = editor.getPlaces();
            }}
        />
    {/if}
    <ButtonEditorCreate text="New Place" onClick={startCreate} />
</EditorWrapper>

<Popup title={stack.current?.title ?? 'Place'} open={stack.depth > 0} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>