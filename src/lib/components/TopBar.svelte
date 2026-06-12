<script lang="ts">
    import { goto } from "$app/navigation";

	interface Props {
		worldName: string;
	}

    function onNoteMenuAction(item: string) {
		showTopMenu = false;
		const ops:any = {
            'Create':()=>{goto('#/create')},
            'Main Menu':()=>{goto('')}
        }
        if(item in ops){
            ops[item]()
        }
	}
	let {
		worldName
	}: Props = $props();

    let showTopMenu = $state(false);
    const menuItems = ['Main Menu', 'Save', 'Load', 'AI', 'Create'];
	function handleMenuAction(item: string) {
		onNoteMenuAction(item);
	}
</script>

<header class="top-bar" aria-label="Game commands">
	<div>
		<p class="eyebrow">Story Engine</p>
		<h1 class="world-title">{worldName}</h1>
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
			<button type="button" onclick={() => handleMenuAction(item)}>{item}</button>
		{/each}
	</nav>
</header>

<style>
	.top-bar {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.menu-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: smaller;
	}

	.menu-toggle {
		display: none;
	}

	.menu-actions button,
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
	.menu-toggle:hover {
		border-color: rgba(215, 177, 115, 0.76);
		background: rgba(215, 177, 115, 0.16);
		transform: translateY(-1px);
	}

	@media (max-width: 780px) {
		.top-bar {
			grid-template-columns: 1fr;
			align-items: center;
			padding: 0.75rem;
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
        .top-bar {
			padding: 0.65rem;
            padding-bottom: 0.1rem;
			gap: 0.65rem;
		}
	}
</style>