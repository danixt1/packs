<script lang="ts">
    import type { NotifyData } from '$lib/notify';

    let { data, onClose, index = 0 }: { data: NotifyData; onClose: () => void; index?: number } = $props();

    $effect(() => {
        const timer = setTimeout(onClose, data.showTime * 1000);
        return () => clearTimeout(timer);
    });

    const icons = {
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`
    };
</script>

<div class="popup-message {data.type}" role="alert" style="top: calc(1rem + {index} * 4.5rem)">
    <span class="icon">{@html icons[data.type]}</span>
    <span class="message">{data.message}</span>
    {#if data.additionalInfo}
        <span class="additional">{data.additionalInfo}</span>
    {/if}
    <button class="close" onclick={onClose} aria-label="Close">×</button>
</div>

<style>
    .popup-message {
        position: fixed;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        border-radius: 0.5rem;
        background: var(--bg-panel-solid, #12141a);
        border: 1px solid var(--border-default, rgba(236, 211, 167, 0.18));
        box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.5);
        font-size: 0.9rem;
        max-width: calc(100vw - 2rem);
        animation: slideIn 0.3s ease-out;
    }

    .popup-message.error { border-color: #e05555; }
    .popup-message.info { border-color: #5599e0; }
    .popup-message.success { border-color: #55e075; }

    .icon {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    .icon :global(svg) {
        width: 1.25rem;
        height: 1.25rem;
    }
    .popup-message.error .icon :global(svg) { color: #e05555; }
    .popup-message.info .icon :global(svg) { color: #5599e0; }
    .popup-message.success .icon :global(svg) { color: #55e075; }

    .message { color: var(--color-text-bright, #f8d89d); font-weight: 500; }
    .additional { color: var(--color-text, #f3eee5); opacity: 0.8; font-size: 0.85em; }

    .close {
        background: none;
        border: none;
        color: var(--color-text, #f3eee5);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0 0.25rem;
        opacity: 0.7;
        margin-left: auto;
    }
    .close:hover { opacity: 1; }

    @keyframes slideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-1rem); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @media (max-width: 480px) {
        .popup-message {
            top: 0.5rem;
            left: 0.5rem;
            right: 0.5rem;
            transform: none;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-1rem); }
            to { opacity: 1; transform: translateY(0); }
        }
    }
</style>