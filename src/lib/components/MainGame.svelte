<script lang="ts">
	import PlayArea from '$lib/components/PlayArea.svelte';
	import WorldBar from '$lib/components/WorldBar.svelte';
	import type { Engine, GameView } from '$lib/engine';

	interface Props {
		view: GameView;
		showMobileActions: boolean;
		callEngine: (func: (engine: Engine) => void | GameView) => void;
	}

	let { view = $bindable(), showMobileActions = $bindable(), callEngine }: Props = $props();
</script>

<main class="game-shell">
	<PlayArea {callEngine} bind:view bind:showMobileActions />
	<WorldBar bind:showMobileActions bind:view />
</main>

<style>
	.game-shell {
		display: grid;
		grid-template-rows: minmax(0, 1fr) minmax(7.5rem, 32vh);
		flex: 1;
		min-height: 0;
		overflow: hidden;
        padding: 1rem;
		gap: 0.6rem;
	}
	@media (max-width: 780px) {
		.game-shell {
			padding: 0.65rem;
            padding-bottom: 0.1rem;
			gap: 0.65rem;
		}
	}
</style>