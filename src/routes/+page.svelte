<script lang="ts">
	import MainGame from '$lib/components/MainGame.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { world } from '$lib/data/world';
	import { createGameEngine, type Engine, type GameView } from '$lib/engine';

	const engine = createGameEngine(world);

	let showMobileActions = $state(false);
	let view = $state(engine.getView());

	function callEngine(func: (engine: Engine) => void | GameView) {
		let ret = func(engine);
		if (ret) {
			view = ret;
		}
	}
</script>

<svelte:head>
	<title>{world.name}</title>
	<meta
		name="description"
		content="A temporary textual game frontend prototype for Story Engine."
	/>
</svelte:head>
<div class="page-layout">
	<TopBar
		worldName={world.name}
	/>

	<MainGame {callEngine} bind:view bind:showMobileActions />
</div>

<style>

	.page-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		box-sizing: border-box;
	}

</style>
