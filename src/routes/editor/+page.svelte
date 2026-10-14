<script lang="ts">
	import { goto } from '$app/navigation';
	import type { World } from '$lib/types/data/declarative';
	import {
		createWorldId,
		deleteWorld,
		listWorlds,
		saveWorld,
		type StoredWorldMetadata
	} from '$lib/shared/gameStorage';

	let availableWorlds = $state<StoredWorldMetadata[]>(listWorlds());
	let isCreateFormOpen = $state(false);
	let newWorldName = $state('');
	let newWorldDescription = $state('');
	let createError = $state('');

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

	function openCreateForm() {
		newWorldName = '';
		newWorldDescription = '';
		createError = '';
		isCreateFormOpen = true;
	}

	function closeCreateForm() {
		isCreateFormOpen = false;
		createError = '';
	}

	function createWorld(event: SubmitEvent) {
		event.preventDefault();
		const name = newWorldName.trim();

		if (!name) {
			createError = 'Enter a name for the new world.';
			return;
		}

		const worldId = createWorldId(name, availableWorlds.map((world) => world.id));
		const newWorld: World = {
			name,
			description: newWorldDescription.trim(),
			version: [1, 0, 0],
			places: [],
			characters: [],
			items: [],
			actions: [],
			vars: [],
			textTemplates: [],
			dialogues: [],
			displays: []
		};

		try {
			saveWorld(worldId, newWorld);
			refreshWorlds();
			closeCreateForm();
			openWorld(worldId);
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Unable to create the world.';
		}
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
				<div class="heading-actions">
					<button type="button" class="create-world-button" onclick={openCreateForm}>New world</button>
					<button type="button" class="main-menu-button" onclick={() => goto('#/')}>Main menu</button>
				</div>
			</div>
			{#if isCreateFormOpen}
				<form class="create-world-form" onsubmit={createWorld} aria-labelledby="new-world-title">
					<div class="form-heading">
						<div>
							<h2 id="new-world-title">Create a new world</h2>
							<p>Start with the basic information, then add story data in the editor.</p>
						</div>
						<button type="button" class="form-close" aria-label="Close create world form" onclick={closeCreateForm}>
							&times;
						</button>
					</div>
					<label for="new-world-name">Name</label>
					<input
						id="new-world-name"
						class="def-input"
						type="text"
						bind:value={newWorldName}
						maxlength="80"
						required
						placeholder="A name for your world"
					/>
					<label for="new-world-description">Description <span>(optional)</span></label>
					<textarea
						id="new-world-description"
						class="def-input"
						bind:value={newWorldDescription}
						maxlength="500"
						rows="4"
						placeholder="What kind of story takes place here?"
					></textarea>
					{#if createError}
						<p class="form-error" role="alert">{createError}</p>
					{/if}
					<div class="form-actions">
						<button type="submit" class="submit-world-button">Create world</button>
						<button type="button" class="cancel-button" onclick={closeCreateForm}>Cancel</button>
					</div>
				</form>
			{/if}
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

	.heading-actions,
	.form-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.create-world-button,
	.submit-world-button,
	.cancel-button,
	.form-close {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-button);
		color: var(--color-accent-light);
		font: inherit;
		cursor: pointer;
		transition: background 160ms ease, border-color 160ms ease;
	}

	.create-world-button,
	.submit-world-button,
	.cancel-button {
		min-height: 2.4rem;
		padding: 0.5rem 0.8rem;
	}

	.create-world-button {
		border-color: var(--border-strong);
		background: rgba(215, 177, 115, 0.14);
	}

	.create-world-button:hover,
	.submit-world-button:hover,
	.cancel-button:hover,
	.form-close:hover {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
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

	.create-world-form {
		display: grid;
		gap: 0.55rem;
		margin: 0 0 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: 0.75rem;
		background: rgba(215, 177, 115, 0.07);
		padding: 1rem;
	}

	.form-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.35rem;
	}

	.form-heading h2,
	.form-heading p {
		margin-top: 0;
	}

	.form-heading h2 {
		margin-bottom: 0.35rem;
		color: var(--color-text-bright);
		font-size: 1.1rem;
	}

	.form-heading p {
		margin-bottom: 0;
		color: var(--color-accent-dim);
		font-size: 0.9rem;
	}

	.form-close {
		width: 2rem;
		height: 2rem;
		padding: 0;
		font-size: 1.4rem;
		line-height: 1;
	}

	.create-world-form label {
		color: var(--color-text-bright);
		font-size: 0.9rem;
		font-weight: 700;
	}

	.create-world-form label span {
		color: var(--color-accent-dim);
		font-weight: 400;
	}

	.create-world-form textarea {
		resize: vertical;
	}

	.form-error {
		margin: 0;
		color: #f1a29a;
		font-size: 0.9rem;
	}

	.form-actions {
		margin-top: 0.35rem;
	}

	.submit-world-button {
		border-color: var(--border-strong);
		background: var(--color-accent);
		color: #211a11;
		font-weight: 700;
	}

	.submit-world-button:hover {
		background: var(--color-text-bright);
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

	@media (max-width: 640px) {
		.heading {
			align-items: stretch;
			flex-direction: column;
		}

		.heading-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.heading-actions button {
			width: 100%;
		}
	}
</style>
