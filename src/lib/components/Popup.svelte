<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props{
        title:string;
        open: boolean;
        onClose?: () => void;
        children: Snippet;
    }
    let { title, onClose, open, children }: Props = $props();

    function dismiss() {
        onClose?.();
    }
</script>
<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') dismiss(); }} />

{#if open}
    <div class="popup-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
        <dialog open class="popup" aria-labelledby="object-editor-title">
            <h2 id="object-editor-title">{title ?? 'Create Object'}</h2>
            {@render children()}
        </dialog>
    </div>
{/if}
<style>
    .popup-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1100;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.88);
    }
    .popup {
        padding: 0;
        width: min(100%, 30rem);
        max-height: 90vh;
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-panel-solid);
        color: var(--color-text);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.55);
        overflow: auto;
    }
    h2 {
        margin: 0;
        padding: 1rem;
        border-bottom: var(--border-subtle) 1px solid;
        font-size: 18px;
    }
</style>