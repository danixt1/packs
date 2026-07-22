<script lang="ts">
    interface Props{
        type: 'text'| 'text-title' | 'number' | 'select' | 'checkbox' | 'radio';
        name: string;
        value:string | number | boolean;
        label?:string;
    }
    let {type:inpType, name, value = $bindable(),label}:Props = $props();
    let className =$state('i');
    let isTitle = $state(false);
    $effect(()=>{
        if(inpType == 'text-title'){
            isTitle = true;
            inpType = 'text';
            className += ' input-title title'
        }
    })
</script>
{#snippet inputLabel(label:string)}
    <span>
        <label for={name} class:title={isTitle}>{@html label}</label>
        <input type={inpType} name={name} bind:value class={className} />
    </span>
{/snippet}
{#if isTitle}
    {@render inputLabel("&gt;")}
{:else}
    {#if label}
        {@render inputLabel(label)}
    {:else}
        <input type={inpType} name={name} bind:value class={className} />
    {/if}
{/if}
<style>
    .i{
        color:var(--color-text);
        background:var(--bg-card);
        border:1px solid var(--border-subtle);
    }
    .i:hover{
        background:var(--bg-card-hover);
    }
    .title{
        font-size:1.5rem;
        font-weight:bold;
        padding:4px 8px;
        padding-left: 0;
        background:transparent;
        border:none;
    }
    .input-title{
        border-bottom:1px solid var(--border-subtle);
        color: var(--color-accent-light);
    }
</style>