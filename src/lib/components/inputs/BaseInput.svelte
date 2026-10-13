<script lang="ts">
    import type { Snippet } from 'svelte';
    interface Props{
        id: string;
        label?: string;
        wrapDiv?: boolean;
        children: Snippet;
    }
    let { id, label, wrapDiv, children }: Props = $props();
</script>

{#if wrapDiv}
    <div class="form-group">
        {#if label}
            <label class="def-label input-label">{label}{@render children()}</label>
        {:else}
            {@render children()}
        {/if}
    </div>
{:else}
    {#if label}
        <label class="def-label input-label">{label}{@render children()}</label>
    {:else}
        {@render children()}
    {/if}
{/if}

<style>
    .input-label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
</style>