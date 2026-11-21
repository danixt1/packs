<script lang='ts'>
    import { onMount } from 'svelte';
    import { goto } from "$app/navigation";
    import { getCurrentWorldEditor, replaceCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { parseWorldExport, saveWorld, serializeWorldExport, slugify } from '$lib/shared/gameStorage';
    import { showError, showSucess } from '$lib/notify';
    import {InputTextArea, InputText} from "$lib/components/inputs";
    import { createContextStack, type ContextFrame } from "$lib/shared/contextStack.svelte";
    import { listenForWorldEditorContextsChanged, notifyWorldEditorContextsChanged } from "$lib/shared/worldEditorContextEvents";
    import Form from "$lib/components/Form.svelte";
    import InputSelect from "$lib/components/inputs/InputSelect.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { untrack } from "svelte";

    let selectedWorld = $state(getCurrentWorldEditor(page.params.worldName));
    let importInput = $state<HTMLInputElement | null>(null);
    let stack = createContextStack();
    let ctxs = $state(untrack(()=>[...selectedWorld.getContexts()]));
    let contextStats = $state(getContextStats());

    function getContextStats() {
        return {
            characters: selectedWorld.getCharacters().length,
            items: selectedWorld.getItems().length,
            places: selectedWorld.getPlaces().length,
            actions: selectedWorld.getActions().length,
            templates: selectedWorld.getTextTemplates().length,
            dialogues: selectedWorld.getDialogues().length,
            events: selectedWorld.getListEvents().length,
            labels: selectedWorld.getLabels().length
        };
    }

    onMount(() => listenForWorldEditorContextsChanged(page.params.worldName ?? '', () => {
        contextStats = getContextStats();
        ctxs = [...selectedWorld.getContexts()];
    }));

    function saveCurrentWorld() {
        const worldId = page.params.worldName;
        if (!worldId) {
            showError('Failed to save world', 'World id is missing');
            return;
        }
        try {
            saveWorld(worldId, selectedWorld.toWorld());
            showSucess('World saved');
        } catch (error) {
            showError('Failed to save world', error instanceof Error ? error.message : 'Unknown storage error');
        }
    }

    function downloadJson(filename: string, content: string) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
    async function createNewContext(){
        let result = await stack.push({
            data:{name:'',title:'',description:'',parent:null,appliesTo:'both',varsAllowed:[],objectsInCtx:{}},
            title:'New Context',
            render:renderContextForm
        })
        if(!result){
            return;
        }
        selectedWorld.addContext(result);
        ctxs = [...selectedWorld.getContexts()];
        notifyWorldEditorContextsChanged(page.params.worldName ?? '');
    }

    function handleContextSubmit(frame:ContextFrame){
        const {draft} = frame;
        if(!draft.name){
            showError('Name is required');
            return;
        }
        if(/[\.\[\]]/.test(draft.name)){
            showError('Special characters like:.[] is not allowed');
            return;
        }
        if(!draft.parent){
            draft.parent = null;
        }
        frame.resolve(draft);
    }
    function exportCurrentWorld() {
        const worldId = page.params.worldName;
        if (!worldId) {
            showError('Failed to export world', 'World id is missing');
            return;
        }
        try {
            const filename = `${slugify(worldId) || 'world'}.story-world.json`;
            downloadJson(filename, serializeWorldExport(selectedWorld.toWorld(), worldId));
            showSucess('World exported');
        } catch (error) {
            showError('Failed to export world', error instanceof Error ? error.message : 'Unknown export error');
        }
    }

    function openImportPicker() {
        importInput?.click();
    }

    async function importWorld(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;

        try {
            const result = parseWorldExport(await file.text());
            if (!result.ok) {
                showError(result.reason);
                return;
            }

            const worldId = page.params.worldName;
            if (!worldId) {
                showError('Failed to import world', 'World id is missing');
                return;
            }
            if (!confirm(`Replace "${selectedWorld.worldName}" with "${result.payload.world.name}"?`)) return;

            const importedEditor = replaceCurrentWorldEditor(worldId, result.payload.world);
            saveWorld(worldId, importedEditor.toWorld());
            selectedWorld = importedEditor;
            notifyWorldEditorContextsChanged(worldId);
            showSucess('World imported');
        } catch (error) {
            showError('Failed to import world', error instanceof Error ? error.message : 'Unknown import error');
        }
    }
</script>

{#snippet renderContextForm(frame:ContextFrame)}
    <Form onSubmit={()=>handleContextSubmit(frame)} onCancel={()=>frame.cancel()}>
        <InputText label='Name:' id='ctx-name' required bind:value={frame.draft.name} wrapDiv />
        <InputText label='Title:' id='ctx-title' bind:value={frame.draft.title} wrapDiv />
        <InputTextArea label='Description' id='ctx-description' bind:value={frame.draft.description} wrapDiv />
        <InputSelect id='ctx-applies-to' label='Applies to:' bind:selected={frame.draft.appliesTo} wrapDiv items={[
            {value:'both',title:'Objects and variables'},
            {value:'objects',title:'Objects only'},
            {value:'variables',title:'Variables only'}
        ]} />
        {#if ctxs.length > 0}
            <InputSelect id='ctx-parent' bind:selected={frame.draft.parent} label='Select a optional child' wrapDiv
            items={[{value:null,title:'-- None --'},...ctxs.map(e =>({
                value:(e.parent ? `${e.parent}.${e.name}` : e.name),
                title: `${e.parent ? e.parent+' > ' : ''} ${e.title || e.name}`
            }))]}/>
        {/if}
    </Form>
{/snippet}

<div class="world-edit">
    <div class="panels">
        <div class="base-info">
            <h2>World: {selectedWorld.worldName}</h2>
            <InputTextArea label="Description: " id='world-desc' bind:value={selectedWorld.description} />
            <ul>
                <li>Characters: {contextStats.characters}</li>
                <li>Items: {contextStats.items}</li>
                <li>Places: {contextStats.places}</li>
                <li>Actions: {contextStats.actions}</li>
                <li>Text Templates: {contextStats.templates}</li>
                <li>Dialogues: {contextStats.dialogues}</li>
                <li>Events: {contextStats.events}</li>
                <li>Labels: {contextStats.labels}</li>
            </ul>
        </div>
        <div class="ctx form-group">
            <h2>Contexts</h2>
            <p>Manage contexts to hide not required elements</p>
            {#if ctxs.length > 0}
                <ObjectTable ref={ctxs} items={ctxs.map(e=>({
                    Title:e.title || e.name,
                    Parent:e.parent ? e.parent : `<span style="color:var(--color-accent)">None</span>`,
                    'Applies to':e.appliesTo === 'objects' ? 'Objects only' : e.appliesTo === 'variables' ? 'Variables only' : 'Objects and variables'}))}
                    headers={['Title','Parent','Applies to']}
                    onDelete={(ctx)=>{
                        selectedWorld.deleteCtx(String(ctx.name), (ctx.parent as string | null) ?? null);
                        ctxs = [...selectedWorld.getContexts()];
                        notifyWorldEditorContextsChanged(page.params.worldName ?? '');
                    }}
                />
            {/if}
            <button onclick={createNewContext}>New Context</button>
        </div>
    </div>
    <div class="options">
        <button type="button" onclick={saveCurrentWorld}>Save</button>
        <button type="button" onclick={exportCurrentWorld}>Export world</button>
        <button type="button" onclick={openImportPicker}>Import world</button>
        <input
            class="hidden-file-input"
            bind:this={importInput}
            type="file"
            accept="application/json,.json"
            aria-label="Import JSON world"
            onchange={importWorld}
        />
        <button type="button" onclick={()=>{goto('#/editor')}}>Back to Worlds</button>
    </div>
</div>
<Popup open={stack.depth > 0} title={stack.current?.title || ''}>
    <ContextHost {stack}/>
</Popup>
<style>
    .options button:hover{
        background:var(--bg-card-hover);
    }
    .options button{
        border-radius: 6px;
        background:var(--bg-button);
        border:1px solid var(--border-subtle);
        color: var(--color-accent-light);
        padding:0.5rem 1rem;
        margin-right:0.5rem;
        cursor:pointer;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			transform 160ms ease;
    }
    .panels{
        display:flex;
        flex-direction:column;
        gap:1rem;
    }
    .world-edit{
        display:flex;
        flex-direction:column;
        width: 100%;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        justify-content:space-between;
    }
    .options{
        display:flex;
        flex-wrap:wrap;
        gap:0.5rem;
        flex-shrink: 0;
        padding:15px;
        border-top:1px solid var(--border-subtle);
    }
    .hidden-file-input{
        display:none;
    }
    .base-info{
        margin:15px
    }
    .ctx p{
        margin-top: 0;
    }
    .ctx button{
        width:100px;
        height: 34px;
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    @media (max-width: 640px) {
        .ctx button{
            width: 100%;
        }
    }
    .ctx button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .ctx button:hover {
        background-color: var(--bg-card-hover);
    }
</style>
