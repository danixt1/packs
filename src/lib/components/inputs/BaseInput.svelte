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
            <label class="def-label" for={id}>{label}</label>
        {/if}
        {@render children()}
    </div>
{:else}
    {#if label}
        <label class="def-label" for={id}>{label}</label>
    {/if}
    {@render children()}
{/if}