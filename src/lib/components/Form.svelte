<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        onSubmit: () => void;
        /** Adding a onCancel fn creates a Cancel button */
        onCancel?: () => void;
        children:Snippet;
    }
    let { onSubmit, onCancel, children }: Props = $props();
</script>

<form onsubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    {@render children()}
    <div class="form-actions">
        <button type="submit">Confirm</button>
        {#if onCancel}
            <button type="button" onclick={onCancel}>Cancel</button>
        {/if}
    </div>
</form>
<style>
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 1rem;
        border-top: var(--border-subtle) 1px solid;
    }
    button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
</style>