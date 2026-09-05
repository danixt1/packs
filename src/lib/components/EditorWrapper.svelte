<script lang="ts">
    import type { Snippet } from "svelte";

    let {children}:{children:Snippet} = $props();
</script>
<div class="wrapper">
    {@render children()}
</div>
<style>
    .wrapper{
        display:flex;
        flex-direction:column;
        gap:1rem;
        padding:1rem;
        height: 100%;
        overflow: hidden;
    }
</style>