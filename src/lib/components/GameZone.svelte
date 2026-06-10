<script lang="ts">
    import { createGameEngine, type ActionOption, type Engine, type GameView } from '$lib/engine';
    import type { World } from '$lib/types/data/declarative';
    import PlayArea from './PlayArea.svelte';
    import WorldBar from './WorldBar.svelte';

    const {world = $bindable()}:{world:World} = $props();

    let engine = $state(createGameEngine(world));
	let view = $derived(engine.getView());
	
	$effect(()=>{
		engine = createGameEngine(world);
		view = engine.getView()
	})
    let showMobileActions = $state(false);
    let showTopMenu = $state(false);

    function engineCaller(func:(engine:Engine)=>GameView|void){
        const ret = func(engine);
        if(ret){
            view = ret;
        }
    }
</script>

<main class="game-shell">
    <PlayArea callEngine={engineCaller} bind:view={view} bind:showMobileActions={showMobileActions}/>
    <WorldBar bind:showMobileActions={showMobileActions} bind:view={view} />
</main>

<style>
    .game-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) minmax(7.5rem, 32vh);
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		padding: 1rem;
		gap: 0.6rem;
		box-sizing: border-box;
	}
</style>