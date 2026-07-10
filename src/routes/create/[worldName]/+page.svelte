<script lang='ts'>
    import { goto } from "$app/navigation";
    import type { World } from "$lib/types/data/declarative";
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    // svelte-ignore state_referenced_locally
    let selectedWorld:World = $state(data.world);
</script>

<div class="world-edit">
    <div class="upper-bar">
        <div>
            <input type="text" name="worldName" id="worldName" class="i input-title" value={selectedWorld.name} />
        </div>
        <div>
            <div class="label-description">
                <label for="worldDescription">World Description:</label>
            </div>
            <textarea name="worldDescription" class="i" id="worldDescription" rows="5" cols="50">{selectedWorld.description}</textarea>
        </div>
        <button type="button" onclick={()=>{goto('#/create')}}>Back to Worlds</button>
    </div>
    <main>
        <div class="search">
            <input type="text" name="search" id="search" placeholder="Search for data..." />
        </div>
        <div>
            
        </div>
    </main>
</div>
<style>
    .world-edit{
        display:flex;
        flex-direction:column;
        gap:1rem;
        padding:1rem;
    }
    .label-description{
        padding:0.5rem 0;
    }
    .i{
        color:var(--color-text);
        background:var(--bg-card);
        border:1px solid var(--border-subtle);
    }
    .i:hover{
        background:var(--bg-card-hover);
    }
    .input-title{
        font-size:1.5rem;
        font-weight:bold;
        width:100%;
        padding:4px 8px;
        background:transparent;
        border:none;
        border-bottom:1px solid var(--border-subtle);
    }
</style>