<script lang="ts">
	import PlayArea from '$lib/components/PlayArea.svelte';
    import WorldBar from '$lib/components/WorldBar.svelte';
	import { world } from '$lib/data/world';
	import { createGameEngine, type Engine, type GameView } from '$lib/engine';

	const menuItems = ['Main Menu', 'Save', 'Load', 'AI', 'Create'];

	const engine = createGameEngine(world);
	
	let showMobileActions = $state(false);
	let showTopMenu = $state(false);
	let view = $state(engine.getView());

	function noteMenuAction(item: string) {
		showTopMenu = false;
		console.info(`${item} is visible as a prototype command, but it is not connected yet.`);
	}
	function callEngine(func:(engine:Engine)=>void|GameView){
		let ret = func(engine);
		if(ret){
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
<div>
	
	<main class="game-shell">
		<header class="top-bar" aria-label="Game commands">
			<div>
				<p class="eyebrow">Story Engine</p>
				<h1 class="world-title">{world.name}</h1>
			</div>
		
			<button
				type="button"
				class="menu-toggle"
				aria-expanded={showTopMenu}
				aria-controls="top-menu-actions"
				onclick={() => (showTopMenu = !showTopMenu)}
			>
				Menu
			</button>
		
			<nav
				id="top-menu-actions"
				class:open={showTopMenu}
				class="menu-actions"
				aria-label="Main menu"
			>
				{#each menuItems as item}
					<button type="button" onclick={() => noteMenuAction(item)}>{item}</button>
				{/each}
			</nav>
		</header>
		
		<PlayArea {callEngine} bind:view={view} bind:showMobileActions={showMobileActions}/>
		<WorldBar bind:showMobileActions={showMobileActions} bind:view={view}/>
	</main>
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

	button {
		font: inherit;
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

	.top-bar{
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		color: #d7b173;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0;
		line-height: 1.15;
	}

	.world-title {
		font-size: clamp(0.95rem, 1.4vw, 1.2rem);
	}

	.menu-actions{
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size:smaller;
	}

	.menu-toggle {
		display: none;
	}

	.menu-actions button,
	.menu-toggle {
		min-height: 2.5rem;
		border: 1px solid rgba(236, 211, 167, 0.2);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.06);
		color: #f7ead6;
		padding: 0.55rem 0.8rem;
		cursor: pointer;
		transition:
			background 160ms ease,
			border-color 160ms ease,
			transform 160ms ease;
	}

	.menu-actions button:hover,
	.menu-toggle:hover {
		border-color: rgba(215, 177, 115, 0.76);
		background: rgba(215, 177, 115, 0.16);
		transform: translateY(-1px);
	}

	@media (max-width: 780px) {
		.game-shell {
			padding: 0.65rem;
			gap: 0.65rem;
		}

		.top-bar {
			grid-template-columns: 1fr;
		}

		.top-bar {
			align-items: center;
		}

		.menu-toggle {
			display: block;
			flex: 0 0 auto;
		}

		.menu-actions {
			position: absolute;
			top: calc(100% + 0.35rem);
			right: 0;
			z-index: 10;
			display: none;
			width: min(100%, 20rem);
			border: 1px solid rgba(236, 211, 167, 0.2);
			border-radius: 8px;
			background: rgba(18, 20, 25, 0.98);
			box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.36);
			padding: 0.5rem;
		}

		.menu-actions.open {
			display: grid;
		}

		.menu-actions button {
			width: 100%;
		}

		.top-bar {
			padding: 0.75rem;
		}
	}
</style>
