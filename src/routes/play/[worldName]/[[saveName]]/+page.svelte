<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MainGame from '$lib/components/MainGame.svelte';
	import { createGameEngine, createRuntimeState, type Engine, type GameView } from '$lib/engine';
	import type { RuntimeState } from '$lib/engine/types';
	import {
		compareWorldVersions,
		createSave,
		loadSave,
		loadWorld,
		parseSaveExport,
		parseSavedState,
		listSaves,
		serializeSaveExport,
		updateSave,
		type StoredSave,
		type WorldLoadResult,
	} from '$lib/shared/gameStorage';
	import { showError, showInfo, showSucess } from '$lib/notify';
	import type { World } from '$lib/types/data/declarative';
    import Popup from '$lib/components/Popup.svelte';
    import ObjectTable from '$lib/components/ObjectTable.svelte';
    import ButtonPopUp from '$lib/components/editor/ButtonPopUp.svelte';

	type GameStatus = 'loading' | 'ready' | 'error';

	let status = $state<GameStatus>('loading');
	let errorMessage = $state('');
	let warningMessage = $state('');
	let world = $state<World | null>(null);
	let save = $state<StoredSave | null>(null);
	let engine = $state<Engine | null>(null);
	let view = $state<GameView | null>(null);
	let showMobileActions = $state(false);
	let showGameMenu = $state(false);
	let showSaveMenu = $state(false);
	let showLoadMenu = $state(false);
	let showSaveAsDialog = $state(false);
	let showDebugPopup = $state(false);
	let saveAsName = $state('');
	let importInput = $state<HTMLInputElement | null>(null);
	let saveSlotsVersion = $state(0);
	let saveSlots = $derived.by(() => {
		saveSlotsVersion;
		return save ? listSaves(save.worldId) : [];
	});
	let params = new URL(page.url.toString().replace('/#/','/')).searchParams;
	function routeParams() {
		return {
			worldId: String(page.params.worldName ?? ''),
			slotId: String(page.params.saveName ?? '')
		};
	}

	function initialize() {
		const { worldId, slotId } = routeParams();
		const isDevWorld = params.has('dev-world');
		const worldResult: WorldLoadResult = loadWorld(worldId);
		if (!worldResult.ok) {
			fail(worldResult.reason);
			return;
		}

		world = worldResult.world;
		let restoredState: RuntimeState|undefined;
		if (isDevWorld) {
			const timestamp = Date.now();
			restoredState = createRuntimeState($state.snapshot(world));
			save = {
				worldId,
				slotId: 'dev-session',
				name: 'Development session',
				createdAt: timestamp,
				updatedAt: timestamp,
				worldVersion: [...world.version],
				serializedState: JSON.stringify(restoredState)
			};
		} else {
			if (!slotId) {
				fail('Save not found.');
				return;
			}
			const saveResult = loadSave(worldId, slotId);
			if (!saveResult.ok) {
				fail(saveResult.reason);
				return;
			}
			restoredState = parseSavedState(saveResult.save.serializedState);
			if (!restoredState) {
				fail('Save data could not be decoded. The original save was left unchanged.');
				return;
			}
			save = saveResult.save;
			warningMessage = saveResult.warning ?? '';
		}

		engine = createGameEngine(world, restoredState);
		view = engine.getView();
		status = 'ready';
	}

	function fail(message: string) {
		status = 'error';
		errorMessage = message;
	}

	function callEngine(func: (currentEngine: Engine) => void | GameView) {
		if (!engine || !world || !save) return;
		const result = func(engine);
		if (result) view = result;
		autosave();
	}

	function autosave() {
		if(params.has('dev-world') || params.has('disabled-auto-save','true')){
			return;
		}
		if (!engine || !world || !save) return;
		const updated = updateSave(save.worldId, save.slotId, engine.getState(), world.version);
		if (updated) save = updated;
	}

	function saveGame() {
		autosave();
		showSucess('Game saved');
		showSaveMenu = false;
		showGameMenu = false;
	}

	function toggleGameMenu() {
		showGameMenu = !showGameMenu;
		if (!showGameMenu) {
			showSaveMenu = false;
			showLoadMenu = false;
		}
	}

	function saveAs() {
		if (!save) return;
		saveAsName = `${save.name} copy`;
		showSaveAsDialog = true;
		showSaveMenu = false;
	}

	function confirmSaveAs() {
		if (!save || !engine || !world || !saveAsName.trim()) return;
		const created = createSave(save.worldId, saveAsName, engine.getState(), world.version);
		save = created;
		saveSlotsVersion += 1;
		showSaveAsDialog = false;
		showGameMenu = false;
		showSucess(`Saved as ${created.name}`);
		goto(`#/play/${encodeURIComponent(created.worldId)}/${encodeURIComponent(created.slotId)}`);
	}

	function loadSelectedSave(slotId: string) {
		if (!world || !save) return;
		const result = loadSave(save.worldId, slotId);
		if (!result.ok) {
			showError(result.reason);
			return;
		}
		const restoredState = parseSavedState(result.save.serializedState);
		if (!restoredState) {
			showError('Save data could not be decoded.');
			return;
		}
		engine = createGameEngine(world, restoredState);
		view = engine.getView();
		save = result.save;
		saveSlotsVersion += 1;
		warningMessage = result.warning ?? '';
		showLoadMenu = false;
		showGameMenu = false;
		showInfo(`Loaded ${result.save.name}`);
		goto(`#/play/${encodeURIComponent(result.save.worldId)}/${encodeURIComponent(result.save.slotId)}`);
	}

	function returnToMenu() {
		autosave();
		goto('#/');
	}

	function leaveWithoutSaving() {
		goto('#/');
	}

	function exportCurrentSave() {
		if (!save) return;
		try {
			autosave();
			const blob = new Blob([serializeSaveExport(save)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${save.slotId}.story-save.json`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			showGameMenu = false;
			showInfo('Save exported');
		} catch (error) {
			showError('Unable to export save', error instanceof Error ? error.message : 'Unknown export error');
		}
	}

	function openImportPicker() {
		showGameMenu = false;
		importInput?.click();
	}

	async function importSave(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !save || !world) return;

		try {
			const result = parseSaveExport(await file.text());
			if (!result.ok) {
				showError(result.reason);
				return;
			}
			if (result.payload.worldId !== save.worldId) {
				showError('This save belongs to a different world.');
				return;
			}
			const compatibility = compareWorldVersions(result.payload.worldVersion, world.version);
			if (!compatibility.compatible) {
				showError(compatibility.reason);
				return;
			}
			const imported = createSave(save.worldId, result.payload.saveName, result.payload.state, world.version);
			save = imported;
			engine = createGameEngine(world, result.payload.state);
			view = engine.getView();
			warningMessage = compatibility.warning ?? '';
			saveSlotsVersion += 1;
			showInfo(`Imported ${imported.name}`);
			goto(`#/play/${encodeURIComponent(imported.worldId)}/${encodeURIComponent(imported.slotId)}`);
		} catch (error) {
			showError('Unable to import save', error instanceof Error ? error.message : 'Unknown import error');
		}
	}

	initialize();

	$effect(() => {
		if (status !== 'ready') return;
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') autosave();
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});
</script>

<svelte:head>
	<title>{world?.name ?? 'Story Engine'}</title>
</svelte:head>

{#if status === 'loading'}
	<main class="state-page"><p>Loading adventure…</p></main>
{:else if status === 'error'}
	<main class="state-page">
		<section class="error-card" aria-labelledby="game-error-title">
			<p class="eyebrow">Unable to open game</p>
			<h1 id="game-error-title">This adventure is unavailable</h1>
			<p>{errorMessage}</p>
			<button type="button" onclick={() => goto('#/')}>Back to main menu</button>
		</section>
	</main>
{:else if engine && view && save}
	<main class="game-page">
		<header class="game-header">
			<div>
				<p class="eyebrow">{world?.name}</p>
				<h1>{save.name}</h1>
			</div>
			<button
				type="button"
				class="menu-button"
				aria-expanded={showGameMenu}
				aria-controls="game-menu"
				onclick={toggleGameMenu}
			>
				Menu
			</button>
			{#if showGameMenu}
				<nav id="game-menu" class="game-menu" aria-label="Game menu">
					<button type="button" onclick={() => (showSaveMenu = !showSaveMenu)}>Save <span aria-hidden="true">›</span></button>
					{#if showSaveMenu}
						<div class="submenu" aria-label="Save options">
							{#if !params.has('dev-world')}
								<button type="button" onclick={saveGame}>Save current</button>
							{/if}
							<button type="button" onclick={saveAs}>Save as new file</button>
						</div>
					{/if}
					<button type="button" onclick={() => (showLoadMenu = !showLoadMenu)}>Load <span aria-hidden="true">›</span></button>
					{#if showLoadMenu}
						<div class="submenu save-selector" aria-label="Available saves">
							{#each saveSlots as saveSlot (saveSlot.slotId)}
								<button type="button" class:active-save={saveSlot.slotId === save.slotId} onclick={() => loadSelectedSave(saveSlot.slotId)}>
									<strong>{saveSlot.name}</strong>
									<small>{new Date(saveSlot.updatedAt).toLocaleString()}</small>
								</button>
							{/each}
						</div>
					{/if}
					{#if params.has('dev-world')}
						<button type="button" onclick={()=>{goto(`#/editor/${params.get('dev-world')}`)}}>Back To Editor</button>
					{/if}
					<button type="button" onclick={exportCurrentSave}>Export JSON save</button>
					<button type="button" onclick={openImportPicker}>Import JSON save</button>
					<button type="button" onclick={returnToMenu}>Save and main menu</button>
					{#if params.has('debug','true')}
						<button type="button" onclick={()=>{showDebugPopup = true}}>debug</button>
					{/if}
					<button type="button" onclick={leaveWithoutSaving}>Leave without saving</button>
				</nav>
			{/if}
		</header>
		<input
			class="hidden-file-input"
			bind:this={importInput}
			type="file"
			accept="application/json,.json"
			aria-label="Import JSON save"
			onchange={importSave}
		/>
		{#if warningMessage}
			<p class="compatibility-warning" role="status">{warningMessage}</p>
		{/if}
		<MainGame {callEngine} bind:view bind:showMobileActions />
	</main>
{/if}

{#if showSaveAsDialog && save}
	<div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) showSaveAsDialog = false; }}>
		<dialog open class="save-as-dialog" aria-labelledby="save-as-title">
			<h2 id="save-as-title">Save as new file</h2>
			<p>Create another save from the current game state.</p>
			<label for="save-as-name">Save name</label>
			<input id="save-as-name" bind:value={saveAsName} maxlength="80" onkeydown={(event) => event.key === 'Enter' && confirmSaveAs()} />
			<div class="dialog-actions">
				<button type="button" onclick={() => (showSaveAsDialog = false)}>Cancel</button>
				<button type="button" class="confirm-button" onclick={confirmSaveAs}>Save copy</button>
			</div>
		</dialog>
	</div>
{/if}
<Popup open={showDebugPopup} title="Debug" onClose={()=>showDebugPopup = false}>
	<div class="form-group">
		{#if engine}
			{@const state = engine.getState()}
			<h3>Characters</h3>
			<details class="debug-info">
				<summary>Actions Running</summary>
				<ObjectTable headers={["Action Name","Self","Targets","Time Left"]}
				items={state.runningActions.map(e =>({
					"Action Name":e.actionName,
					Self:e.actorId,
					Targets:e.option.targets.map(e =>e.id).join(','),
					"Time Left":e.completeAt - e.startedAt
				}))}/>
			</details>
			<details class="debug-info">
				<summary>Debug Messages</summary>
				<ObjectTable headers={['Index','Type','Message']}
				items={state.debug.map((e,i)=>({
					Index:i,
					Type:e.indexOf(':') != -1 ? e.substring(0,e.indexOf(':')) : '--',
					Message:e}))}/>
			</details>

			{#each state.characters as char }
			<details class="debug-info">
  				<summary>Char:{char.name}({char.id})</summary>
				<h4>Variables:</h4>
				<ObjectTable
				headers = {['Name','Value']}
				items={char.vars.map(e =>({
					Name:e.name,
					Value:e.value
				}))}/>
				{#if char.autonomy}
					<p>Goal:{char.autonomyState.currentGoal || "None"}</p>
					<p>Last Action Done: {char.autonomyState.lastActionName}</p>
				{/if}
			</details>
			{/each}
		{/if}
		<ButtonPopUp onclick={()=>showDebugPopup = false} text="Close" />
	</div>
</Popup>
<style>
	.debug-info{
		margin: 6px 0;
	}
	.state-page,
	.game-page {
		box-sizing: border-box;
		min-height: 100%;
	}

	.state-page {
		display: grid;
		place-items: center;
		padding: 2rem;
	}

	.error-card {
		width: min(100%, 34rem);
		border: 1px solid var(--border-default);
		border-radius: 0.75rem;
		background: var(--bg-panel);
		padding: 2rem;
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
	}

	.error-card h1 {
		margin: 0 0 0.75rem;
	}

	.error-card p:not(.eyebrow) {
		color: var(--color-accent-dim);
		line-height: 1.6;
	}

	.error-card button,
	.menu-button,
	.game-menu button {
		border: 1px solid var(--border-subtle);
		border-radius: 0.45rem;
		background: var(--bg-button);
		color: var(--color-text);
		padding: 0.6rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}

	.error-card button:hover,
	.menu-button:hover,
	.game-menu button:hover {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
	}

	.game-page {
        position: absolute;
		display: flex;
		flex-direction: column;
		max-height: 100%;
		min-width: 100%;
	}

	.game-header {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem clamp(1rem, 2vw, 2rem) 0;
	}

	.eyebrow {
		margin: 0 0 0.3rem;
		color: var(--color-accent);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.1rem, 2.4vw, 1.5rem);
	}

	.menu-button {
		min-width: 5rem;
	}

	.game-menu {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: clamp(1rem, 3vw, 2rem);
		display: grid;
		gap: 0.35rem;
		width: min(16rem, calc(100vw - 2rem));
		border: 1px solid var(--border-subtle);
		border-radius: 0.6rem;
		background: var(--bg-overlay);
		padding: 0.5rem;
		box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.35);
	}

	.game-menu button {
		text-align: left;
	}

	.game-menu button span {
		float: right;
		color: var(--color-accent);
	}

	.submenu {
		display: grid;
		gap: 0.25rem;
		margin: -0.15rem 0 0.2rem 0.65rem;
		border-left: 1px solid var(--border-strong);
		padding-left: 0.5rem;
	}

	.submenu button {
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.88rem;
	}

	.save-selector button {
		display: grid;
		gap: 0.15rem;
	}

	.save-selector small {
		color: var(--color-accent-dim);
	}

	.save-selector .active-save {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
	}

	.hidden-file-input {
		display: none;
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

	.save-as-dialog {
		display: grid;
		gap: 0.75rem;
		width: min(100%, 26rem);
		border: 1px solid var(--border-default);
		border-radius: 0.75rem;
		background: var(--bg-panel-solid);
		color: var(--color-text);
		padding: 1.25rem;
	}

	.save-as-dialog h2,
	.save-as-dialog p {
		margin: 0;
	}

	.save-as-dialog p {
		color: var(--color-accent-dim);
		line-height: 1.5;
	}

	.save-as-dialog input {
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

	.dialog-actions button {
		border: 1px solid var(--border-subtle);
		border-radius: 0.45rem;
		background: var(--bg-button);
		color: var(--color-text);
		padding: 0.55rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}

	.dialog-actions .confirm-button {
		border-color: var(--border-strong);
		background: rgba(215, 177, 115, 0.16);
		color: var(--color-text-bright);
	}

	.compatibility-warning {
		margin: 0.75rem clamp(1rem, 3vw, 2rem) 0;
		border: 1px solid rgba(215, 177, 115, 0.45);
		border-radius: 0.45rem;
		background: rgba(215, 177, 115, 0.1);
		color: var(--color-text-bright);
		padding: 0.65rem 0.8rem;
		font-size: 0.9rem;
	}

	@media (max-width: 780px) {
		.game-header {
			padding-top: 0.75rem;
		}
	}
</style>
