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
    import ListVars from "$lib/components/lists/ListVars.svelte";
    import { untrack } from "svelte";

    let selectedWorld = $state(getCurrentWorldEditor(page.params.worldName));
    let worldVars = $state(untrack(()=>selectedWorld.getWorldVars()));
    let importInput = $state<HTMLInputElement | null>(null);
    let stack = createContextStack();
    let ctxs = $state(untrack(()=>[...selectedWorld.getContexts()]));
    let overview = $state(getOverview());

    $effect(()=>selectedWorld.setWorldVars($state.snapshot(worldVars)))
    function getOverview() {
        const world = selectedWorld.toWorld();
        return {
            characters: selectedWorld.getCharacters().length,
            items: selectedWorld.getItems().length,
            places: selectedWorld.getPlaces().length,
            actions: selectedWorld.getActions().length,
            templates: selectedWorld.getTextTemplates().length,
            dialogues: selectedWorld.getDialogues().length,
            procedures: selectedWorld.getProcedures().length,
            events: selectedWorld.getListEvents().length,
            labels: selectedWorld.getLabels().length,
            contexts: selectedWorld.getContexts().length,
            categories: selectedWorld.getCategories().length,
            version: world.version.join('.')
        };
    }

    onMount(() => listenForWorldEditorContextsChanged(page.params.worldName ?? '', () => {
        overview = getOverview();
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

    function getContextPath(context: {name:string; parent:string|null}) {
        return context.parent ? `${context.parent}.${context.name}` : context.name;
    }

    async function editContext(context: {name:string; parent:string|null}) {
        const originalPath = getContextPath(context);
        const excludedPaths = new Set([originalPath]);
        let foundDescendant = true;
        while(foundDescendant){
            foundDescendant = false;
            for(const candidate of ctxs){
                const candidatePath = getContextPath(candidate);
                if(candidate.parent && excludedPaths.has(candidate.parent) && !excludedPaths.has(candidatePath)){
                    excludedPaths.add(candidatePath);
                    foundDescendant = true;
                }
            }
        }
        const result = await stack.push({
            title: `Edit ${context.name}`,
            data: context,
            render: renderContextForm,
            meta: { mode: 'edit', originalName: context.name, originalParent: context.parent, excludedPaths: [...excludedPaths] }
        });
        if(!result) return;
        selectedWorld.updateContext(context.name, context.parent, $state.snapshot(result));
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
        const editMeta = frame.meta?.mode === 'edit' ? frame.meta : undefined;
        const originalPath = editMeta
            ? editMeta.originalParent ? `${editMeta.originalParent}.${editMeta.originalName}` : editMeta.originalName
            : null;
        const nextPath = draft.parent ? `${draft.parent}.${draft.name}` : draft.name;
        if(editMeta?.excludedPaths?.includes(draft.parent ?? '') && draft.parent !== editMeta.originalParent){
            showError('A context cannot be moved inside itself or one of its children');
            return;
        }
        if(editMeta && nextPath !== originalPath && nextPath.startsWith(`${originalPath}.`)){
            showError('A context cannot be moved inside itself or one of its children');
            return;
        }
        if(ctxs.some(context => context.name === draft.name && context.parent === draft.parent
            && !(editMeta && context.name === editMeta.originalName && context.parent === editMeta.originalParent))){
            showError('A context with this name already exists here');
            return;
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
            worldVars = importedEditor.getWorldVars();
            overview = getOverview();
            ctxs = [...selectedWorld.getContexts()];
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
        {@const excludedPaths = new Set(frame.meta?.excludedPaths ?? [])}
        {@const availableParents = ctxs.filter(context => !excludedPaths.has(getContextPath(context)))}
        {#if availableParents.length > 0}
            <InputSelect id='ctx-parent' bind:selected={frame.draft.parent} label='Select a optional child' wrapDiv
            items={[{value:null,title:'-- None --'},...availableParents.map(e =>({
                value:(e.parent ? `${e.parent}.${e.name}` : e.name),
                title: `${e.parent ? e.parent+' > ' : ''} ${e.title || e.name}`
            }))]}/>
        {/if}
    </Form>
{/snippet}

<div class="world-edit">
    <div class="panels">
        <section class="overview-panel">
            <div class="world-heading">
                <div class="eyebrow">WORLD WORKSPACE <span>VERSION {overview.version}</span></div>
                <h1>{selectedWorld.worldName}</h1>
                <p>World data, shared variables, and editing contexts.</p>
            </div>
            <div class="description-field">
                <InputTextArea label="World description" id='world-desc' bind:value={selectedWorld.description} />
            </div>
            <div class="stats-grid" aria-label="World content summary">
                <div class="stat-card stat-highlight"><span>World variables</span><strong>{worldVars.length}</strong><small>Shared across the world</small></div>
                <div class="stat-card"><span>Characters</span><strong>{overview.characters}</strong><small>People and entities</small></div>
                <div class="stat-card"><span>Places</span><strong>{overview.places}</strong><small>Locations in the world</small></div>
                <div class="stat-card"><span>Items</span><strong>{overview.items}</strong><small>Objects to discover</small></div>
                <div class="stat-card"><span>Actions</span><strong>{overview.actions}</strong><small>Player and autonomous actions</small></div>
                <div class="stat-card"><span>Dialogues</span><strong>{overview.dialogues}</strong><small>Conversation trees</small></div>
                <div class="stat-card"><span>Procedures</span><strong>{overview.procedures}</strong><small>Reusable effect sequences</small></div>
                <div class="stat-card"><span>Text templates</span><strong>{overview.templates}</strong><small>Reusable story text</small></div>
            </div>
            <div class="world-details" aria-label="Additional world data">
                <span><strong>{overview.contexts}</strong> contexts</span>
                <span><strong>{overview.labels}</strong> labels</span>
                <span><strong>{overview.categories}</strong> action categories</span>
                <span><strong>{overview.events}</strong> events</span>
            </div>
        </section>

        <div class="management-grid">
            <section class="editor-panel world-vars">
                <div class="panel-heading">
                    <div><span class="eyebrow">WORLD STATE</span><h2>Shared variables</h2></div>
                    <span class="count-badge">{worldVars.length}</span>
                </div>
                <p class="panel-description">Values available to the whole world. Read and set markers show where each variable is used.</p>
                <ListVars {stack} bind:values={worldVars} contextEditor={selectedWorld} title="World Variables" />
            </section>
            <section class="editor-panel context-panel">
                <div class="panel-heading">
                    <div><span class="eyebrow">ORGANIZATION</span><h2>Contexts</h2></div>
                    <span class="count-badge">{ctxs.length}</span>
                </div>
                <p class="panel-description">Group objects and variables so editors can focus on the relevant parts of the world.</p>
                {#if ctxs.length > 0}
                    <ObjectTable ref={ctxs} items={ctxs.map(e=>({
                        Title:e.title || e.name,
                        Parent:e.parent ? e.parent : `<span style="color:var(--color-accent)">Root context</span>`,
                        'Applies to':e.appliesTo === 'objects' ? 'Objects' : e.appliesTo === 'variables' ? 'Variables' : 'Objects and variables'}))}
                        headers={['Title','Parent','Applies to']}
                        onEdit={(context) => editContext(context as {name:string; parent:string|null})}
                        onDelete={(ctx)=>{
                            selectedWorld.deleteCtx(String(ctx.name), (ctx.parent as string | null) ?? null);
                            ctxs = [...selectedWorld.getContexts()];
                            overview = getOverview();
                            notifyWorldEditorContextsChanged(page.params.worldName ?? '');
                        }}
                    />
                {:else}
                    <div class="empty-state"><strong>No contexts yet</strong><span>Add contexts to group parts of the world for editing.</span></div>
                {/if}
                <button class="new-context" onclick={createNewContext}>New Context</button>
            </section>
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
    .panels{
        display:flex;
        flex:1;
        min-height:0;
        flex-direction:column;
        gap:1.25rem;
        overflow:auto;
        padding:clamp(1rem, 2.5vw, 2rem);
    }
    .overview-panel,
    .editor-panel{
        background:linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
        border:1px solid var(--border-subtle);
        border-radius:14px;
        box-shadow:0 12px 30px rgba(0,0,0,0.12);
    }
    .overview-panel{padding:clamp(1rem, 2vw, 1.5rem);}
    .world-heading{margin-bottom:1.1rem;}
    .eyebrow{
        display:flex;
        align-items:center;
        gap:.65rem;
        color:var(--color-accent);
        font-size:.68rem;
        font-weight:750;
        letter-spacing:.14em;
        text-transform:uppercase;
    }
    .eyebrow span{color:var(--color-accent-dim);letter-spacing:.08em;}
    .world-heading h1{margin:.35rem 0;font-size:clamp(1.7rem, 4vw, 2.4rem);color:var(--color-text-bright);}
    .world-heading p,.panel-description{margin:0;color:var(--color-accent-dim);line-height:1.5;}
    .description-field{max-width:850px;margin-bottom:1.2rem;}
    .stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;}
    .stat-card{
        display:flex;min-height:94px;flex-direction:column;justify-content:center;gap:.15rem;
        padding:.85rem 1rem;border:1px solid var(--border-subtle);border-radius:10px;background:rgba(0,0,0,.13);
    }
    .stat-card span{color:var(--color-accent-dim);font-size:.78rem;}
    .stat-card strong{font-size:1.55rem;line-height:1.15;color:var(--color-text-bright);}
    .stat-card small{color:var(--color-accent-dim);font-size:.7rem;}
    .stat-highlight{border-color:var(--border-strong);background:linear-gradient(135deg,rgba(215,177,115,.14),rgba(0,0,0,.12));}
    .world-details{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem;}
    .world-details span,.count-badge{padding:.35rem .65rem;border:1px solid var(--border-subtle);border-radius:999px;background:rgba(0,0,0,.13);color:var(--color-accent-dim);font-size:.76rem;}
    .world-details strong{color:var(--color-text);}
    .management-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,1fr);align-items:start;gap:1rem;}
    .editor-panel{min-width:0;padding:1rem;}
    .panel-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.5rem;}
    .panel-heading h2{margin:.2rem 0 0;font-size:1.25rem;color:var(--color-text-bright);}
    .count-badge{color:var(--color-text);font-weight:700;}
    .panel-description{margin-bottom:1rem;font-size:.88rem;}
    .world-vars :global(.form-group){padding:0;}
    .world-vars :global(h3){margin:.5rem 0;color:var(--color-text-bright);font-size:1rem;}
    .world-vars :global(table){border-collapse:separate;border-spacing:0 .35rem;}
    .world-vars :global(thead th){padding:.65rem .75rem;border-bottom:1px solid var(--border-strong);color:var(--color-accent);font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;}
    .world-vars :global(tbody tr){background:rgba(0,0,0,.13);}
    .world-vars :global(tbody tr:hover){background:var(--bg-card-hover);}
    .world-vars :global(tbody td){padding:.7rem .75rem;border-bottom:0;color:var(--color-text);vertical-align:middle;}
    .world-vars :global(tbody td:first-child){border-radius:8px 0 0 8px;}
    .world-vars :global(tbody td:last-child){border-radius:0 8px 8px 0;}
    .world-vars :global(.options){display:flex;justify-content:flex-end;gap:.35rem;}
    .world-vars :global(button),.new-context{
        border:1px solid var(--border-subtle);border-radius:7px;background:var(--bg-button);color:var(--color-text);
        padding:.45rem .7rem;cursor:pointer;transition:background .16s,border-color .16s;
    }
    .world-vars :global(button:hover),.new-context:hover{background:var(--bg-card-hover);border-color:var(--border-strong);}
    .world-vars :global(button.btn-primary){margin-top:.75rem;color:var(--color-accent-light);}
    .context-panel :global(table){margin:.25rem 0 .8rem;}
    .context-panel :global(thead th){color:var(--color-accent);font-size:.75rem;}
    .context-panel :global(tbody td){color:var(--color-text);}
    .context-panel :global(.options){display:flex;gap:.25rem;}
    .context-panel :global(button){border:1px solid var(--border-subtle);border-radius:6px;background:var(--bg-button);color:var(--color-text);padding:.35rem .55rem;cursor:pointer;}
    .context-panel :global(button:hover){background:var(--bg-card-hover);border-color:var(--border-strong);}
    .new-context{width:100%;margin-top:.35rem;color:var(--color-accent-light);}
    .empty-state{display:flex;flex-direction:column;gap:.3rem;padding:1rem;border:1px dashed var(--border-strong);border-radius:9px;color:var(--color-accent-dim);font-size:.85rem;}
    .empty-state strong{color:var(--color-text);}
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
    @media (max-width: 900px) {
        .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
        .management-grid{grid-template-columns:1fr;}
    }
    @media (max-width: 520px) {
        .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;}
        .stat-card{min-height:82px;padding:.7rem;}
        .stat-card strong{font-size:1.3rem;}
        .world-details{gap:.4rem;}
        .options{padding:1rem;}
        .options button{flex:1;}
    }
    .options button:focus-visible,.new-context:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .options button:hover {
        background-color: var(--bg-card-hover);
    }
</style>
