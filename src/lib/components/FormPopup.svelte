<script lang="ts">
    import "$lib/types/components/ObjectEditorPopUp.d.ts";
    import type { Snippet } from 'svelte';
    interface Props{
        open: boolean;
        title?: string;
        onClose?: () => void;
        onCancel?:() => void;
        onSubmit: () => void;
        keepOpen?:boolean
        children: Snippet;
    }
    let { open = $bindable(false), title, onClose, onSubmit, children,keepOpen = false, onCancel }: Props = $props();

    function close() {
        if(keepOpen){
            return;
        }
        open = false;
        onClose?.();
    }
</script>
<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') close(); }} />

{#if open}
    <div class="popup-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <dialog open class="popup" aria-labelledby="object-editor-title">
            <form onsubmit={(event) => { event.preventDefault(); onSubmit(); close(); }}>
                <h2 id="object-editor-title">{title ?? 'Create Object'}</h2>
                {@render children()}
                <div class="form-actions">
                    <button type="submit">Create</button>
                    <button type="button" onclick={()=>{onCancel?.(),close()}}>Cancel</button>
                </div>
            </form>
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
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-panel-solid);
        color: var(--color-text);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.55);
    }
    h2 {
        margin: 0;
        padding: 1rem;
        border-bottom: var(--border-subtle) 1px solid;
        font-size: 18px;
    }
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