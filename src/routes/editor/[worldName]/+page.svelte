<script lang='ts'>
    import { goto } from "$app/navigation";
    import { getCurrentWorldEditor, replaceCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { parseWorldExport, saveWorld, serializeWorldExport, slugify } from '$lib/shared/gameStorage';
    import { showError, showSucess } from '$lib/notify';
    import {InputTextArea, InputText} from "$lib/components/inputs";
    import { type ContextFrame } from "$lib/shared/contextStack.svelte";
    let selectedWorld = $state(getCurrentWorldEditor(page.params.worldName));
    let importInput = $state<HTMLInputElement | null>(null);

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
            showSucess('World imported');
        } catch (error) {
            showError('Failed to import world', error instanceof Error ? error.message : 'Unknown import error');
        }
    }
</script>
{#snippet renderContextForm(frame:ContextFrame)}
    <!-- TODO: make the system to add sublevels-->
    <InputText label='Name:' id='ctx-name' required bind:value={frame.draft.name}/>
    <InputTextArea label='Description' id='ctx-description' bind:value={frame.draft.description}/>

{/snippet}
<div class="world-edit">
    <div class="panels">
        <div class="ctx form-group">
            <h2>Contexts</h2>
            <p>Manage contexts to hide not required elements</p>
            <button>New Context</button>
        </div>
        <div class="base-info">
            <h2>World: {selectedWorld.worldName}</h2>
            <InputTextArea label="Description: " id='world-desc' bind:value={selectedWorld.description} />
            <ul>
                <li>Characters: {selectedWorld.getCharacters().length}</li>
                <li>Items: {selectedWorld.getItems().length}</li>
                <li>Places: {selectedWorld.getPlaces().length}</li>
                <li>Actions: {selectedWorld.getActions().length}</li>
                <li>Text Templates: {selectedWorld.getTextTemplates().length}</li>
                <li>Dialogues: {selectedWorld.getDialogues().length}</li>
                <li>Events: {selectedWorld.getListEvents().length}</li>
                <li>Labels: {selectedWorld.getLabels().length}</li>
            </ul>
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