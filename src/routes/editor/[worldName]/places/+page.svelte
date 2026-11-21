<script lang="ts">
    import { onMount } from 'svelte';
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { listenForWorldEditorContextsChanged } from "$lib/shared/worldEditorContextEvents";
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
    import { createContextStack, type ContextFrame } from "$lib/shared/contextStack.svelte";
    import ContextMembershipInput from "$lib/components/editor/ContextMembershipInput.svelte";

    type PlaceFormData = Place & {
        oid?: string;
        _baseOID?: string;
        _contextPaths: string[];
        _variableContexts: Record<string, string[]>;
    };

    let editor = getCurrentWorldEditor(page.params.worldName);
    let places = $state(editor.getPlaces());

    const stack = createContextStack();

    onMount(() => listenForWorldEditorContextsChanged(page.params.worldName ?? '', () => {
        places = editor.getPlaces();
    }));

    async function startCreate() {
        const newPlace = await stack.push<PlaceFormData, PlaceFormData>({
            title: 'New Place',
            data: { id: '', name: '', description: '', charactersId: [], connectedPlaces: [], vars: [], _contextPaths: [], _variableContexts: {} },
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
            editor.setObjectContexts('place', newPlace.name, newPlace._contextPaths);
            editor.syncVariableContexts(newPlace.vars.map((variable) => variable.name), newPlace._variableContexts);
            places = editor.getPlaces();
            showSucess('Place created');
        }
    }

    async function startEdit(item: Record<string, any>) {
        const originalOid = item.oid as string;
        const original = editor.getObject(originalOid) as Place | undefined;
        if (!original) return;
        const target = $state.snapshot({ ...original, oid: originalOid }) as PlaceFormData;
        target._baseOID = originalOid;
        target._contextPaths = editor.getObjectContexts('place', target.name);
        target._variableContexts = Object.fromEntries(target.vars.map((variable) => [
            variable.name,
            editor.getVariableContexts(variable.name)
        ]));

        const updated = await stack.push<PlaceFormData, PlaceFormData>({
            title: `Edit ${target.id}`,
            data: target,
            render: renderPlaceForm,
            meta: { mode: 'edit', originalId: target.id }
        });

        if (updated) {
            const cleanId = String(updated.id ?? '').trim();
            const previousObject = editor.getObject(originalOid) as Place | undefined;
            if (cleanId.match(/[\s,'"]/)) {
                showError('Id cannot have special characters and spaces');
                return;
            }
            const baseOid = updated._baseOID ?? originalOid;
            if (baseOid !== 'place:' + cleanId && editor.getObject('place:' + cleanId)) {
                showError('Place id Already exist');
                return;
            }
            const { _baseOID: _ignoredBaseOID, _contextPaths, _variableContexts, oid: _ignoredOid, ...placeData } = updated;
            placeData.id = cleanId;
            editor.updateObjectWithOid(baseOid, placeData);
            editor.setObjectContexts('place', placeData.name, _contextPaths, previousObject?.name ?? placeData.name);
            editor.syncVariableContexts(
                placeData.vars.map((variable) => variable.name),
                _variableContexts,
                target.vars.map((variable) => variable.name)
            );
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

{#snippet renderPlaceForm(frame: ContextFrame)}
    {@const charactersInfo = editor.getCharacters()
    .map((c) => {
        const res =places.find(e =>e.id != frame.meta?.originalId && e.charactersId.includes(c.id))
        return { 
        value: c.id, 
        title: c.name + (res ? ` (In: ${res.name})` : ''),
        disabled:res != undefined }
    })}
    <Form onSubmit={submitPlaceForm} onCancel={cancelPlaceForm}>
        <div class="form-group">
            <InputText id="place-id" label="Place ID" bind:value={frame.draft.id} required autocomplete='off'/>
            <InputText id="place-name" label="Place Name" bind:value={frame.draft.name} required autocomplete='off'/>
            <InputTextArea id="place-description" label="Description" bind:value={frame.draft.description} />
            <ContextMembershipInput id="place-contexts" label="Object contexts:" contexts={editor.getContexts()} appliesTo="objects" bind:value={frame.draft._contextPaths} />
            <InputCard id="place-characters" label="Characters In Place" bind:selectedItems={frame.draft.charactersId} items={charactersInfo} />
            <InputCard id="connected-places" label="Connected Places" bind:selectedItems={frame.draft.connectedPlaces} items={places.filter(e =>e.id != frame.draft.id).map((p) => ({ value: p.id, title: p.name }))} />
            <ListVars {stack} bind:values={frame.draft.vars} contextEditor={editor} bind:variableContextPaths={frame.draft._variableContexts} />
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
