<script lang='ts'>
    import { goto } from "$app/navigation";
    import TopBar from "$lib/components/TopBar.svelte";
    import type { World } from "$lib/types/data/declarative";
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    // svelte-ignore state_referenced_locally
    let selectedWorld:World = $state(data.world);
</script>

<div class="page-layout">
    <TopBar worldName='Create'/>
    <div class="world-edit">
        <div class="upper-bar">
            <input type="text" name="worldName" id="worldName" value={selectedWorld.name} />
            <textarea name="worldDescription" id="worldDescription">{selectedWorld.description}</textarea>
            <button type="button" onclick={()=>{goto('#/create')}}>Back to Worlds</button>
        </div>
    </div>
</div>