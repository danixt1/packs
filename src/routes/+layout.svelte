<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import { type NotifyData, notificationsCallbacks } from '$lib/notify';
    import Notification from '$lib/components/Notification.svelte';

	let { children } = $props();
	let notifications = $state<NotifyData[]>([]);

	function addNewNotification(data: NotifyData) {
		notifications = [...notifications, data];
	}

	function removeNotification(index: number) {
		notifications = notifications.filter((_, i) => i !== index);
	}

	notificationsCallbacks(addNewNotification);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="popup-messages">
    {#each notifications as notification, idx (notification)}
        <Notification
            data={notification}
            onClose={() => removeNotification(idx)}
            index={idx}
        />
    {/each}
</div>
{@render children()}

<style>
	:root {
		/* Primary palette */
		--color-accent: #d7b173;
		--color-accent-light: #f7ead6;
		--color-accent-dim: #c9c0b4;
		--color-text: #f3eee5;
		--color-text-bright: #f8d89d;

		/* Backgrounds */
		--bg-panel: rgba(18, 20, 25, 0.82);
		--bg-panel-solid: #12141a;
		--bg-card: rgba(255, 255, 255, 0.08);
		--bg-card-hover: rgba(215, 177, 115, 0.16);
		--bg-dialog: rgba(7, 9, 12, 0.42);
		--bg-overlay: rgba(18, 20, 25, 0.98);

		/* Borders */
		--border-subtle: rgba(236, 211, 167, 0.16);
		--border-default: rgba(236, 211, 167, 0.18);
		--border-strong: rgba(215, 177, 115, 0.42);
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
	:global(body) {
		margin: 0;
		min-width: 320px;
		overflow: hidden;
		background:
			radial-gradient(circle at top left, rgba(156, 106, 47, 0.24), transparent 32rem),
			linear-gradient(135deg, #111318 0%, #1d1b1f 48%, #101723 100%);
		color: var(--color-text);
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	}
</style>