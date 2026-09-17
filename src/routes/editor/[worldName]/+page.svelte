<script lang='ts'>
    import { goto } from "$app/navigation";
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    let selectedWorld = getCurrentWorldEditor(page.params.worldName);
</script>

<div class="world-edit">
    <div class="panels">
        <div class="base-info">
            <h2>World: {selectedWorld.worldName}</h2>
            <span>Description: {selectedWorld.description}</span>
            <ul>
                <li>Characters: {selectedWorld.getCharacters().length}</li>
                <li>Items: {selectedWorld.getItems().length}</li>
                <li>Places: {selectedWorld.getPlaces().length}</li>
                <li>Actions: {selectedWorld.getActions().length}</li>
                <li>Labels: {selectedWorld.getLabels().length}</li>
                <li>Text Templates: Not set</li>
                <li>Dialogues: Not set</li>
            </ul>
        </div>
    </div>
    <div class="options">
        <button type="button" onclick={()=>{}}>Save</button>
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
        flex-shrink: 0;
        padding:15px;
        border-top:1px solid var(--border-subtle);
    }
    .base-info{
        margin:15px
    }
</style>