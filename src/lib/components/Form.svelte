<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        onSubmit: () => void;
        /** Adding a onCancel fn creates a Cancel button */
        onCancel?: () => void;
        children:Snippet;
        fullSizeMode?:boolean;
        confirmText?:string;
        cancelText?:string;
    }
    let { onSubmit, onCancel, children, fullSizeMode, confirmText, cancelText }: Props = $props();
</script>

<form onsubmit={(event) => { event.preventDefault(); onSubmit(); }} class={fullSizeMode ? 'fullSize' : ''}>
    <div class="capsule">
        {@render children()}
    </div>
    <div class="form-actions">
        {#if onCancel}
        <button type="button" onclick={onCancel}>{cancelText || 'Cancel'}</button>
        {/if}
        <button type="submit">{confirmText || 'Confirm'}</button>
    </div>
</form>
<style>
    form{
        display: flex;
        justify-content: space-between;
        flex-direction: column;
    }
    .capsule{
        overflow: auto;
        flex-shrink: 1;
    }
    @media screen and (max-width:732px){
        .form-actions{
            flex-shrink: 0;
            padding: 0.7rem !important;
        }
        form{
            height:100%;
        }
        .fullSize{
            height:87dvh;
        }
    }
    @media screen and (min-width:732px){
        .fullSize{
            height:80dvh;
        }
        form{
            max-height: 80dvh;
        }
    }
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 10px 10px 5px;
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