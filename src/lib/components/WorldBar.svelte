<script lang="ts">
    import type { GameView } from "$lib/engine";

	interface WorldBarProps{
		showMobileActions:boolean
		view:GameView
	}
	let {showMobileActions = $bindable(),view = $bindable()}:WorldBarProps = $props();
    type PanelTab = 'characters' | 'items' | 'places';

	const tabs: { id: PanelTab; label: string }[] = [
		{ id: 'characters', label: 'Characters' },
		{ id: 'items', label: 'Items' },
		{ id: 'places', label: 'Places' }
	];
	function getNumberVariable(entity: { vars: { name: string; type: string; value: string | number | boolean; max?: number }[] }, name: string) {
		const variable = entity.vars.find((item) => item.name === name && item.type === 'number');

		return variable?.type === 'number' && typeof variable.value === 'number' ? variable as { name: string; type: 'number'; value: number; max?: number } : null;
	}
    let activeTab = $state<PanelTab>('characters');
</script>

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

<style>
	h3,
	p {
		margin-top: 0;
	}
	h3 {
		margin-bottom: 0;
		font-size: 1rem;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size:smaller;
	}
	.mobile-actions-button{
		display: none;
	}
	.tabs button,
	.mobile-actions-button {
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

	.tabs button:hover,
	.tabs button.active,
	.mobile-actions-button:hover {
		border-color: rgba(215, 177, 115, 0.76);
		background: rgba(215, 177, 115, 0.16);
		transform: translateY(-1px);
	}

	.info-card p,
	.empty-state p:last-child {
		margin-bottom: 0;
		color: #c9c0b4;
		line-height: 1.55;
	}
	.bottom-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.75rem;
		overflow: auto;
		padding-right: 0.25rem;
	}
	.bottom-bar {
		border-radius: 8px;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.75rem;
		padding: 1rem 0rem 1rem 0rem;
		min-height: 0;
		max-height: 32vh;
		overflow: hidden;
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
		.mobile-actions-button {
			display: block;
			width: 100%;
		}
		.bottom-bar {
			grid-template-rows: auto auto minmax(0, 1fr);
			max-height: 38vh;
			padding: 0.5rem 0rem 0.7rem 0rem;
		}
	}
</style>