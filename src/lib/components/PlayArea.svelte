<script lang="ts">
    import {type ActionOption, type Engine, type GameView } from '$lib/engine';
    import ActionPanel from './ActionPanel.svelte';
	
	interface Props{
		view:GameView
		callEngine:(func:(engine:Engine)=>GameView|void)=> void
		showMobileActions:boolean
	}
	let {view = $bindable(),callEngine,showMobileActions = $bindable()}:Props = $props();
	let showTopMenu = $state(false);

	function chooseDialogue(choiceId: string) {
		callEngine((e)=>e.dispatch({type:'choose-dialogue',choiceId}));
	}
	function executeAction(action:ActionOption){
		showMobileActions = false
		callEngine((e)=>e.dispatch({type:'start-action',actionOptionId:action.id}))
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

<section class:show-mobile-actions={showMobileActions} class="play-area">
	<aside class="actions-panel" aria-label="actions">
		<div class="panel-heading">
			<p class="eyebrow">Actions</p>
		</div>
		<div class="action-list">
		{#each view.availableActions as action}
			<ActionPanel action={action} executeAction={executeAction}/>
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
<style>
	.actions-panel,
	.dialog-panel {
		border: 1px solid var(--border-default);
		background: var(--bg-panel);
		box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.24);
		backdrop-filter: blur(16px);
	}
	.eyebrow {
		margin: 0 0 0.25rem;
		color: var(--color-accent);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h2,
	p {
		margin-top: 0;
	}

	h2 {
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}
	.play-area {
		display: grid;
		grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
		gap: 1rem;
		min-height: 0;
	}

	.actions-panel,
	.dialog-panel {
		border-radius: 8px;
	}

	.actions-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		overflow: hidden;
	}
	.action-list {
		display: grid;
		gap: 0.75rem;
		overflow: auto;
		padding-right: 0.25rem;
	}

	.dialog-panel {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 1rem;
		padding: 1rem;
		overflow: hidden;
	}

	.scene-context {
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 1rem;
	}

	.scene-context p:last-child {
		margin-bottom: 0;
		color: var(--color-accent-dim);
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
		border-left: 3px solid var(--color-accent);
		background: var(--bg-dialog);
		padding: 0.85rem 1rem;
	}

	.dialog-entry strong {
		display: block;
		margin-bottom: 0.35rem;
		color: var(--color-text-bright);
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
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		background: rgba(215, 177, 115, 0.14);
		color: var(--color-accent-light);
		padding: 0.5rem 0.75rem;
		cursor: pointer;
	}
	@media(max-width: 780px){

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

		.actions-panel,
		.dialog-panel{
			padding: 0.75rem;
		}
	}
</style>