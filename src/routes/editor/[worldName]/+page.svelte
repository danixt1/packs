<script lang='ts'>
    import { goto } from "$app/navigation";
    import Input from "$lib/components/Input.svelte";
    import type { World } from "$lib/types/data/declarative";
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    // svelte-ignore state_referenced_locally
    let selectedWorld:World = $state(data.world);
</script>

<div class="world-edit">
    <div class="panels">
        <div class="base-info">
            <div>
                <Input type="text-title" name="worldName" bind:value={selectedWorld.name}/>
            </div>
            <div>
                <div class="label-description">
                    <label for="worldDescription">World Description:</label>
                </div>
                <textarea name="worldDescription" class="i" id="worldDescription" rows="5" cols="50">{selectedWorld.description}</textarea>
            </div>
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
        background:var(--bg-card);
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
</style>