<script lang="ts">
	import { goto } from '$app/navigation';
	import { deleteWorld, listWorlds, type StoredWorldMetadata } from '$lib/shared/gameStorage';

	let availableWorlds = $state<StoredWorldMetadata[]>(listWorlds());

	function refreshWorlds() {
		availableWorlds = listWorlds();
	}

	function openWorld(worldId: string) {
		goto(`#/editor/${encodeURIComponent(worldId)}`);
	}

	function removeWorld(event: MouseEvent, worldId: string) {
		event.stopPropagation();
		if (!confirm('Delete this world and its local saves?')) return;
		if (deleteWorld(worldId)) refreshWorlds();
	}
</script>

<main>
	<section class="worlds" aria-labelledby="editor-title">
		<div class="worlds-list">
			<div class="heading">
				<div>
					<p class="eyebrow">World editor</p>
					<h1 id="editor-title">Available worlds</h1>
					<p>Choose a world to edit its story data.</p>
				</div>
				<button type="button" class="main-menu-button" onclick={() => goto('#/')}>Main menu</button>
			</div>
			{#each availableWorlds as world (world.id)}
				<article class="world-item">
					<button type="button" class="world-open" onclick={() => openWorld(world.id)}>
						<span class="world-title">{world.name}</span>
						<span>{world.description || 'No description.'}</span>
						<span class="world-version">Version {world.version.join('.')}</span>
					</button>
					{#if world.id !== 'main'}
						<button type="button" class="world-delete-btn" title={`Delete ${world.name}`} onclick={(event) => removeWorld(event, world.id)}>
							Delete
						</button>
					{/if}
				</article>
			{/each}
		</div>
		<p class="coming-soon">Creating worlds from the editor is coming soon.</p>
	</section>
</main>

<style>
	main {
		flex: 1;
		overflow-y: auto;
		padding: clamp(1rem, 4vw, 2rem);
	}

	.worlds {
		width: min(100%, 58rem);
		margin: 0 auto;
		border: 1px solid var(--border-default);
		border-radius: 0.75rem;
		background: var(--bg-panel);
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.24);
	}

	.worlds-list {
		display: grid;
		gap: 0.75rem;
		padding: clamp(1rem, 4vw, 2rem);
	}

	.heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.main-menu-button {
		flex-shrink: 0;
		min-height: 2.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-button);
		color: var(--color-accent-light);
		padding: 0.5rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}

	.main-menu-button:hover {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
	}

	.eyebrow,
	.world-version {
		color: var(--color-accent);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1,
	p {
		margin-top: 0;
	}

	.heading p:last-child {
		margin-bottom: 0;
		color: var(--color-accent-dim);
	}

	.world-item {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		padding: 0.75rem;
		transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
	}

	.world-item:hover {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
		transform: translateY(-1px);
	}

	.world-open {
		display: grid;
		flex: 1;
		gap: 0.35rem;
		border: 0;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.world-open:focus-visible,
	.world-delete-btn:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.world-title {
		color: var(--color-text-bright);
		font-size: 1.1rem;
		font-weight: 700;
	}

	.world-version {
		font-size: 0.65rem;
	}

	.world-delete-btn {
		align-self: center;
		border: 1px solid rgba(231, 76, 60, 0.45);
		border-radius: 0.4rem;
		background: transparent;
		color: #f1a29a;
		padding: 0.45rem 0.6rem;
		cursor: pointer;
	}

	.world-delete-btn:hover {
		background: rgba(231, 76, 60, 0.14);
	}

	.coming-soon {
		margin: 0;
		border-top: 1px solid var(--border-subtle);
		padding: 1rem clamp(1rem, 4vw, 2rem);
		color: var(--color-accent-dim);
		font-size: 0.9rem;
	}

	@media (max-width: 640px) {
		.heading {
			align-items: stretch;
			flex-direction: column;
		}

		.main-menu-button {
			align-self: start;
		}
	}
</style>
