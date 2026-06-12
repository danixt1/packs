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
	:global(body) {
		margin: 0;
		min-width: 320px;
		overflow: hidden;
		background:
			radial-gradient(circle at top left, rgba(156, 106, 47, 0.24), transparent 32rem),
			linear-gradient(135deg, #111318 0%, #1d1b1f 48%, #101723 100%);
		color: #f3eee5;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	}

	.page-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		box-sizing: border-box;
	}

	:global(*) {
		scrollbar-color: rgba(215, 177, 115, 0.7) rgba(255, 255, 255, 0.06);
		scrollbar-width: thin;
	}

	:global(*::-webkit-scrollbar) {
		width: 0.55rem;
		height: 0.55rem;
	}

	:global(*::-webkit-scrollbar-track) {
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
	}

	:global(*::-webkit-scrollbar-thumb) {
		border: 2px solid rgba(18, 20, 25, 0.92);
		border-radius: 999px;
		background: linear-gradient(180deg, #d7b173, #8f6731);
	}

	:global(*::-webkit-scrollbar-thumb:hover) {
		background: linear-gradient(180deg, #f0c987, #a87a3a);
	}
</style>
