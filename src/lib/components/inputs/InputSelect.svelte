<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        label: string;
        wrapDiv?: boolean;
        items: {value:string, title:string}[];
        selected: string;
    }
    let { id, label, wrapDiv, items, selected = $bindable() }: Props = $props();
    
    function updateSelected(value: string) {
        selected = value;
    }
</script>

<BaseInput {id} {wrapDiv}>
    <div class="select-container">
        {#if label}
            <span class="def-label">{label}</span>
        {/if}
        <div class="list">
            {#each items as item (item.value)}
                <input 
                    type="radio" 
                    id="{id}-{item.value}" 
                    name={id} 
                    class="item-radio"
                    checked={selected === item.value}
                    onchange={() => updateSelected(item.value)}
                />
                <label for="{id}-{item.value}" class="item-label">{item.title}</label>
            {/each}
        </div>
    </div>
</BaseInput>

<style>
    .select-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }
    
    .item-radio {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .item-label {
        display: inline-block;
        padding: 6px 12px;
        background: var(--bg-panel-solid);
        border: 1px solid var(--border-default);
        border-radius: 15px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        font-size: 0.9rem;
        color: var(--color-text);
    }
    
    .item-radio:checked + .item-label {
        background-color: var(--bg-card-hover);
        color: var(--color-text);
        border-color: var(--border-strong);
    }
    
    .item-label:hover {
        background-color: var(--bg-card-hover);
    }
    
    .item-radio:checked + .item-label:hover {
        background-color: var(--bg-card-hover);
    }
</style>
