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
</svelte:head>

<MainGame {callEngine} bind:view bind:showMobileActions />

