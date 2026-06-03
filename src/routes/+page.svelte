<script lang="ts">
	import { world } from '$lib/data/world';
	import { createGameEngine, type ActionOption } from '$lib/engine';

	type PanelTab = 'characters' | 'items' | 'places';

	const menuItems = ['Main Menu', 'Save', 'Load', 'AI', 'Create'];
	const tabs: { id: PanelTab; label: string }[] = [
		{ id: 'characters', label: 'Characters' },
		{ id: 'items', label: 'Items' },
		{ id: 'places', label: 'Places' }
	];

	const engine = createGameEngine(world);
	
	let activeTab = $state<PanelTab>('characters');
	let showMobileActions = $state(false);
	let showTopMenu = $state(false);
	let view = $state(engine.getView());

	function getNumberVariable(entity: { vars: { name: string; type: string; value: string | number | boolean; max?: number }[] }, name: string) {
		const variable = entity.vars.find((item) => item.name === name && item.type === 'number');

		return variable?.type === 'number' && typeof variable.value === 'number' ? variable as { name: string; type: 'number'; value: number; max?: number } : null;
	}

	function executeAction(action: ActionOption) {
		view = engine.dispatch({ type: 'start-action', actionOptionId: action.id });
		showMobileActions = false;
	}

	function chooseDialogue(choiceId: string) {
		view = engine.dispatch({ type: 'choose-dialogue', choiceId });
	}

	function noteMenuAction(item: string) {
		showTopMenu = false;
		console.info(`${item} is visible as a prototype command, but it is not connected yet.`);
	}
	function GoToFinal(element: HTMLElement,_?: any) {
		function updateScroll() {
			element.scrollTop = element.scrollHeight;
		}
		updateScroll();
		return {
			update: updateScroll
		};
	}
</script>

<svelte:head>
	<title>{world.name}</title>
	<meta
		name="description"
		content="A temporary textual game frontend prototype for Story Engine."
	/>
</svelte:head>

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

	<section class:show-mobile-actions={showMobileActions} class="play-area" aria-label="Current game scene">
		<aside class="actions-panel" aria-label="actions">
			<div class="panel-heading">
				<p class="eyebrow">Actions</p>
				<h2>What can happen next</h2>
			</div>

			<div class="action-list">
				{#each view.availableActions as action}
					<button
						type="button"
						class="action-card"
						disabled={action.locked}
						onclick={() => executeAction(action)}
					>
						<span>{action.name}</span>
						<small>{action.description ?? 'No description available.'}</small>
						<strong>{action.executionTime} min</strong>
					</button>
				{/each}
			</div>
		</aside>

		<section class="dialog-panel" aria-label="Dialog log">
			<div class="scene-context">
				<h2>{view.currentPlace.name}</h2>
				<p>{view.currentPlace.description}</p>
			</div>

			<div class="dialog-log" use:GoToFinal={view.log}>
				{#each view.log as entry}
					<article class="dialog-entry">
						<p>{entry}</p>
					</article>
				{/each}

				{#if view.activeDialogue}
					<article class="dialog-entry dialogue-choice-panel">
						<strong>{view.activeDialogue.speaker}</strong>
						<p>{view.activeDialogue.text}</p>
						<div class="dialogue-choices">
							{#each view.activeDialogue.choices as choice}
								<button type="button" onclick={() => chooseDialogue(choice.id)}>{choice.text}</button>
							{/each}
						</div>
					</article>
				{/if}
			</div>
		</section>
	</section>

	<footer class="bottom-bar" aria-label="World information">
		<button
			type="button"
			class="mobile-actions-button"
			aria-expanded={showMobileActions}
			onclick={() => (showMobileActions = !showMobileActions)}
		>
			{showMobileActions ? 'Dialog' : 'Actions'}
		</button>

		<div class="tabs" role="tablist" aria-label="Inventory panels">
			{#each tabs as tab}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					class:active={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="bottom-content">
			{#if activeTab === 'characters'}
				{#each view.visibleCharacters as character}
					{@const health = getNumberVariable(character, 'health')}
					<article class:player-card={character.id === view.playerId} class="info-card">
						<div>
							<h3>{character.name}</h3>
						</div>

						{#if health}
							<div class="health-block">
								<span>Health</span>
								<strong>{health.value}{health.max ? ` / ${health.max}` : ''}</strong>
								<div class="health-track" aria-hidden="true">
									<div
										class="health-fill"
										style={`width: ${Math.min(100, Math.max(0, health.value))}%`}
									></div>
								</div>
							</div>
						{/if}
					</article>
				{/each}
			{:else if activeTab === 'items'}
				{#if view.items.length}
					{#each view.items as item}
						<article class="info-card">
							<h3>{item.name}</h3>
							<p>{item.description}</p>
						</article>
					{/each}
				{:else}
					<div class="empty-state">
						<p class="eyebrow">Items</p>
						<p>No items are available here.</p>
					</div>
				{/if}
			{:else}
				{#each [view.currentPlace] as place}
					<article class="info-card">
						<div>
							<p class="eyebrow">Place</p>
							<h3>{place.name}</h3>
							<p>{place.description}</p>
						</div>
						<span>{place.connectedPlaces.length} connection(s)</span>
					</article>
				{/each}
			{/if}
		</div>
	</footer>
</main>

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

	.top-bar,
	.bottom-bar,
	.actions-panel,
	.dialog-panel {
		border: 1px solid rgba(236, 211, 167, 0.18);
		background: rgba(18, 20, 25, 0.82);
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.24);
		backdrop-filter: blur(16px);
	}

	.top-bar {
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
	h2,
	h3,
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

	h2 {
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	h3 {
		margin-bottom: 0;
		font-size: 1rem;
	}

	.menu-actions,
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size:smaller;
	}

	.mobile-actions-button,
	.menu-toggle {
		display: none;
	}

	.menu-actions button,
	.tabs button,
	.mobile-actions-button,
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
	.tabs button:hover,
	.tabs button.active,
	.mobile-actions-button:hover,
	.menu-toggle:hover {
		border-color: rgba(215, 177, 115, 0.76);
		background: rgba(215, 177, 115, 0.16);
		transform: translateY(-1px);
	}

	.play-area {
		display: grid;
		grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
		gap: 1rem;
		min-height: 0;
	}

	.actions-panel,
	.dialog-panel,
	.bottom-bar {
		border-radius: 8px;
	}

	.actions-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		overflow: hidden;
	}

	.panel-heading {
		flex: 0 0 auto;
	}

	.action-list {
		display: grid;
		gap: 0.75rem;
		overflow: auto;
		padding-right: 0.25rem;
	}

	.action-card {
		display: grid;
		gap: 0.35rem;
		width: 100%;
		border: 1px solid rgba(236, 211, 167, 0.16);
		border-radius: 8px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
		color: #f7ead6;
		padding: 0.9rem;
		text-align: left;
		cursor: pointer;
	}

	.action-card:hover {
		border-color: rgba(215, 177, 115, 0.78);
	}

	.action-card span {
		font-weight: 800;
	}

	.action-card small {
		color: #c9c0b4;
		line-height: 1.45;
	}

	.action-card strong {
		color: #d7b173;
		font-size: 0.78rem;
	}

	.dialog-panel {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 1rem;
		padding: 1rem;
		overflow: hidden;
	}

	.scene-context {
		border-bottom: 1px solid rgba(236, 211, 167, 0.14);
		padding-bottom: 1rem;
	}

	.scene-context p:last-child,
	.info-card p,
	.empty-state p:last-child {
		margin-bottom: 0;
		color: #c9c0b4;
		line-height: 1.55;
	}

	.dialog-log {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow: auto;
		padding-right: 0.25rem;
	}

	.dialog-entry {
		max-width: 58rem;
		border-left: 3px solid #d7b173;
		background: rgba(7, 9, 12, 0.42);
		padding: 0.85rem 1rem;
	}

	.dialog-entry strong {
		display: block;
		margin-bottom: 0.35rem;
		color: #f8d89d;
	}

	.dialog-entry p {
		margin-bottom: 0;
		line-height: 1.65;
	}

	.dialogue-choices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.dialogue-choices button {
		min-height: 2.35rem;
		border: 1px solid rgba(215, 177, 115, 0.42);
		border-radius: 6px;
		background: rgba(215, 177, 115, 0.14);
		color: #f7ead6;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
	}

	.bottom-bar {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.75rem;
		padding: 1rem;
		min-height: 0;
		max-height: 32vh;
		overflow: hidden;
	}

	.bottom-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.75rem;
		overflow: auto;
		padding-right: 0.25rem;
	}

	.info-card,
	.empty-state {
		border: 1px solid rgba(236, 211, 167, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.9rem;
	}

	.info-card {
		display: grid;
		gap: 0.75rem;
	}

	.player-card {
		border-color: rgba(215, 177, 115, 0.72);
		background: rgba(215, 177, 115, 0.12);
	}

	.health-block {
		display: grid;
		gap: 0.35rem;
	}

	.health-block span,
	.info-card > span {
		color: #c9c0b4;
		font-size: 0.82rem;
	}

	.health-block strong {
		color: #f8d89d;
	}

	.health-track {
		height: 0.45rem;
		overflow: hidden;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
	}

	.health-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #5cc985, #d7b173);
	}

	@media (max-width: 780px) {
		.game-shell {
			padding: 0.65rem;
			gap: 0.65rem;
		}

		.top-bar,
		.play-area {
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

		.play-area {
			display: grid;
			grid-template-columns: 1fr;
		}

		.actions-panel {
			display: none;
		}

		.dialog-panel {
			min-height: 0;
		}

		.play-area.show-mobile-actions .actions-panel {
			display: flex;
		}

		.play-area.show-mobile-actions .dialog-panel {
			display: none;
		}

		.mobile-actions-button {
			display: block;
			width: 100%;
		}

		.bottom-bar {
			grid-template-rows: auto auto minmax(0, 1fr);
			max-height: 38vh;
		}

		.top-bar,
		.actions-panel,
		.dialog-panel,
		.bottom-bar {
			padding: 0.75rem;
		}
	}
</style>
