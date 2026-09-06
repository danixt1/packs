<script lang="ts">
    interface Props {
        text: string;
        onClick: () => void;
        disabled?: boolean;
    }
    let {text, onClick, disabled = false}:Props = $props();
</script>
<div class="btn-create">
    <button type="button" class="btn btn-primary" disabled={disabled} onclick={onClick}>{text}</button>
</div>

<style>
    .btn-create{
        display: flex;
        justify-content: center;
    }
    .btn-create button{
        height: 34px;
        width: 50%;
    }
    
    button {
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