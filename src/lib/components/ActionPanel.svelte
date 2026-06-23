<script lang="ts">
    import type { ActionOption } from "$lib/engine";

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
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
		color: var(--color-accent-light);
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
		color: var(--color-accent-dim);
		line-height: 1.45;
	}

	.action-card strong {
		color: var(--color-accent);
		font-size: 0.78rem;
	}
</style>