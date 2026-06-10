<script lang="ts">
    import type { ActionOption, Engine } from "$lib/engine";

    const {action,executeAction}:{action:ActionOption,executeAction:(action:ActionOption)=>void} = $props();

</script>

<button type="button" class="action-card" 
disabled={action.locked} onclick={()=>executeAction(action)}
aria-label="action">
    <span>{action.name}</span>
    <small>{action.description ?? 'No description available.'}</small>
    <strong>{action.executionTime} min</strong>
</button>

<style>
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
</style>