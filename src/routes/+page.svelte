<script lang="ts">
	import { goto } from '$app/navigation';
	import { createRuntimeState } from '$lib/engine';
	import { compareWorldVersions, createSave, deleteSave, listSaves, listWorlds, parseSaveExport, renameSave, type StoredSaveMetadata, type StoredWorldMetadata } from '$lib/shared/gameStorage';
	import { loadWorld } from '$lib/shared/gameStorage';
	import { showError } from '$lib/notify';

	let availableWorlds = $state<StoredWorldMetadata[]>(listWorlds());
	let selectedWorldId = $state('main');
	let savesVersion = $state(0);
	let saves = $derived.by(() => {
		savesVersion;
		return listSaves(selectedWorldId);
	});
	let renameTarget = $state<StoredSaveMetadata | null>(null);
	let renameValue = $state('');
	let newGameWorld = $state<StoredWorldMetadata | null>(null);
	let newGameName = $state('New adventure');
	let importInput = $state<HTMLInputElement | null>(null);

	function refreshWorlds() {
		availableWorlds = listWorlds();
		if (!availableWorlds.some((world) => world.id === selectedWorldId)) selectedWorldId = availableWorlds[0]?.id ?? 'main';
		savesVersion += 1;
	}

	function startNewGame(world: StoredWorldMetadata) {
		newGameWorld = world;
		newGameName = 'New adventure';
	}

	function createNewGame() {
		if (!newGameWorld) return;
		const worldId = newGameWorld.id;
		const saveName = newGameName.trim();
		if (!saveName) return;
		const loadedWorld = loadWorld(newGameWorld.id);
		if (!loadedWorld.ok) return;
		const state = createRuntimeState(loadedWorld.world);
		const save = createSave(worldId, saveName, state, newGameWorld.version);
		newGameWorld = null;
		goto(`#/play/${encodeURIComponent(worldId)}/${encodeURIComponent(save.slotId)}`);
	}

	function continueGame(worldId: string, save: StoredSaveMetadata) {
		goto(`#/play/${encodeURIComponent(worldId)}/${encodeURIComponent(save.slotId)}`);
	}

	function removeSave(save: StoredSaveMetadata) {
		if (!confirm(`Delete save "${save.name}"?`)) return;
		deleteSave(save.worldId, save.slotId);
		refreshWorlds();
	}

	function openRename(save: StoredSaveMetadata) {
		renameTarget = save;
		renameValue = save.name;
	}

	function saveRename() {
		if (!renameTarget || !renameValue.trim()) return;
		renameSave(renameTarget.worldId, renameTarget.slotId, renameValue);
		renameTarget = null;
		refreshWorlds();
	}

	function openImportPicker() {
		importInput?.click();
	}

	async function importSave(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const result = parseSaveExport(await file.text());
			if (!result.ok) {
				showError(result.reason);
				return;
			}
			const world = availableWorlds.find((candidate) => candidate.id === result.payload.worldId);
			if (!world) {
				showError('The save belongs to a world that is not available here.');
				return;
			}
			const compatibility = compareWorldVersions(result.payload.worldVersion, world.version);
			if (!compatibility.compatible) {
				showError(compatibility.reason);
				return;
			}
			const imported = createSave(world.id, result.payload.saveName, result.payload.state, world.version);
			refreshWorlds();
			selectedWorldId = world.id;
			goto(`#/play/${encodeURIComponent(imported.worldId)}/${encodeURIComponent(imported.slotId)}`);
		} catch (error) {
			showError('Unable to import save', error instanceof Error ? error.message : 'Unknown import error');
		}
	}
</script>

<svelte:head>
	<title>Story Engine</title>
</svelte:head>

<main class="main-menu">
	<section class="hero" aria-labelledby="main-menu-title">
		<p class="eyebrow">Story Engine</p>
		<h1 id="main-menu-title">Choose your story</h1>
		<p>Play a saved adventure, start a new one, or shape a world in the editor.</p>
	</section>

	<section class="world-list" aria-labelledby="worlds-title">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Local worlds</p>
				<h2 id="worlds-title">Available worlds</h2>
			</div>
			<button type="button" class="secondary-button" onclick={() => goto('#/editor')}>Open editor</button>
			<button type="button" class="secondary-button" onclick={openImportPicker}>Import save</button>
			<input class="hidden-file-input" bind:this={importInput} type="file" accept="application/json,.json" aria-label="Import JSON save" onchange={importSave} />
		</div>

		{#each availableWorlds as world (world.id)}
			<article class="world-card">
				<div class="world-card-heading">
					<div>
						<h3>{world.name}</h3>
						<p>{world.description || 'No description.'}</p>
					</div>
					<span class="version">v{world.version.join('.')}</span>
				</div>
				<div class="world-actions">
					<button type="button" class="primary-button" onclick={() => startNewGame(world)}>New game</button>
					<button type="button" class="secondary-button" onclick={() => { selectedWorldId = world.id; }}>View saves</button>
				</div>

				{#if selectedWorldId === world.id}
					<div class="save-list" aria-label={`Saves for ${world.name}`}>
						{#if saves.length === 0}
							<p class="empty-state">No saves yet. Start a new adventure.</p>
						{:else}
							{#each saves as save (save.slotId)}
								<div class="save-row">
									<div>
										<strong>{save.name}</strong>
										<small>Updated {new Date(save.updatedAt).toLocaleString()}</small>
									</div>
									<div class="save-actions">
										<button type="button" onclick={() => continueGame(world.id, save)}>Continue</button>
										<button type="button" onclick={() => openRename(save)}>Rename</button>
										<button type="button" class="danger-button" onclick={() => removeSave(save)}>Delete</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</article>
		{/each}
	</section>

	<section class="coming-soon" aria-label="Unavailable options">
		<button type="button" disabled>AI <span>Coming soon</span></button>
		<button type="button" disabled>Settings <span>Coming soon</span></button>
	</section>
</main>

{#if renameTarget}
	<div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) renameTarget = null; }}>
		<dialog open class="rename-dialog" aria-labelledby="rename-title">
			<h2 id="rename-title">Rename save</h2>
			<label for="save-name">Save name</label>
			<input id="save-name" bind:value={renameValue} maxlength="80" onkeydown={(event) => event.key === 'Enter' && saveRename()} />
			<div class="dialog-actions">
				<button type="button" class="secondary-button" onclick={() => renameTarget = null}>Cancel</button>
				<button type="button" class="primary-button" onclick={saveRename}>Rename</button>
			</div>
		</dialog>
	</div>
{/if}

{#if newGameWorld}
	<div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) newGameWorld = null; }}>
		<dialog open class="rename-dialog" aria-labelledby="new-game-title">
			<h2 id="new-game-title">Start a new game</h2>
			<p class="dialog-description">Choose a name for your local save in {newGameWorld.name}.</p>
			<label for="new-save-name">Save name</label>
			<input id="new-save-name" bind:value={newGameName} maxlength="80" onkeydown={(event) => event.key === 'Enter' && createNewGame()} />
			<div class="dialog-actions">
				<button type="button" class="secondary-button" onclick={() => newGameWorld = null}>Cancel</button>
				<button type="button" class="primary-button" onclick={createNewGame}>Start game</button>
			</div>
		</dialog>
	</div>
{/if}

<style>
	.main-menu {
		width: min(100%, 70rem);
		box-sizing: border-box;
		margin: 0 auto;
		padding: clamp(1.25rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem);
	}

	.hero {
		max-width: 42rem;
		margin-bottom: 2.5rem;
	}

	.eyebrow,
	.version,
	.coming-soon span {
		color: var(--color-accent);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0.75rem;
		font-size: clamp(2rem, 6vw, 4rem);
		line-height: 1;
	}

	.hero p:last-child,
	.world-card-heading p,
	.empty-state {
		color: var(--color-accent-dim);
		line-height: 1.6;
	}

	.section-heading,
	.world-card-heading,
	.world-actions,
	.save-row,
	.save-actions,
	.dialog-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.world-list {
		display: grid;
		gap: 1rem;
	}

	.section-heading {
		align-items: end;
		margin-bottom: 0.25rem;
	}

	.section-heading h2 {
		margin-bottom: 0;
	}

	.world-card {
		border: 1px solid var(--border-default);
		border-radius: 0.75rem;
		background: var(--bg-panel);
		padding: clamp(1rem, 3vw, 1.5rem);
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.2);
	}

	.world-card-heading {
		align-items: start;
	}

	.world-card-heading h3 {
		margin-bottom: 0.35rem;
		color: var(--color-text-bright);
	}

	.world-card-heading p {
		margin-bottom: 0;
	}

	.version {
		white-space: nowrap;
	}

	.world-actions {
		justify-content: start;
		margin-top: 1.25rem;
	}

	.primary-button,
	.secondary-button,
	.save-actions button,
	.coming-soon button {
		min-height: 2.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: 0.45rem;
		background: var(--bg-button);
		color: var(--color-text);
		padding: 0.5rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}

	.primary-button {
		border-color: var(--border-strong);
		background: rgba(215, 177, 115, 0.16);
		color: var(--color-text-bright);
	}

	.primary-button:hover,
	.secondary-button:hover,
	.save-actions button:hover {
		background: var(--bg-card-hover);
	}

	.save-list {
		display: grid;
		gap: 0.5rem;
		margin-top: 1.25rem;
		border-top: 1px solid var(--border-subtle);
		padding-top: 1rem;
	}

	.save-row {
		align-items: start;
		border: 1px solid var(--border-subtle);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	.save-row strong,
	.save-row small {
		display: block;
	}

	.save-row small {
		margin-top: 0.25rem;
		color: var(--color-accent-dim);
	}

	.save-actions {
		justify-content: end;
		flex-wrap: wrap;
	}

	.save-actions button {
		min-height: 2rem;
		padding: 0.35rem 0.55rem;
		font-size: 0.85rem;
	}

	.danger-button {
		color: #f1a29a !important;
	}

	.coming-soon {
		display: flex;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.coming-soon button {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.coming-soon span {
		margin-left: 0.3rem;
		font-size: 0.6rem;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.78);
	}

	.hidden-file-input {
		display: none;
	}

	.rename-dialog {
		display: grid;
		gap: 0.75rem;
		width: min(100%, 26rem);
		border: 1px solid var(--border-default);
		border-radius: 0.75rem;
		background: var(--bg-panel-solid);
		color: var(--color-text);
		padding: 1.25rem;
	}

	.rename-dialog h2 {
		margin-bottom: 0.25rem;
	}

	.dialog-description {
		margin-bottom: 0.25rem;
		color: var(--color-accent-dim);
		line-height: 1.5;
	}

	.rename-dialog input {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid var(--border-subtle);
		border-radius: 0.4rem;
		background: var(--bg-button);
		color: var(--color-text);
		padding: 0.65rem;
		font: inherit;
	}

	.dialog-actions {
		justify-content: end;
		margin-top: 0.5rem;
	}

	@media (max-width: 640px) {
		.section-heading,
		.world-card-heading,
		.save-row {
			align-items: stretch;
			flex-direction: column;
		}

		.save-actions {
			justify-content: start;
		}
	}
</style>

