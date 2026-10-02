<script lang="ts">
    interface Props {
        text: string;
        onclick: () => void;
        disabled?: boolean;
    }
    let {text, onclick, disabled = false}:Props = $props();
</script>
<div class="editor-btn">
    <button type="button" class="btn btn-primary" disabled={disabled} onclick={onclick}>{text}</button>
</div>
<style>
    .editor-btn{
        width: 100%;
    }
    button{
        width: 100%;
        height: 34px;
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    button:hover {
        background-color: var(--bg-card-hover);
    }
    
</style>