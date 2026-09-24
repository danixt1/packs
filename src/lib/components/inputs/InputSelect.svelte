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
    
</script>

<BaseInput {id} {wrapDiv}>
    <div class="select-container">
        {#if label}
            <label class="def-label" for={id}>{label}</label>
        {/if}
        <select {id} bind:value={selected} class="def-select">
            {#each items as item (item.value)}
                <option value={item.value}>{item.title}</option>
            {/each}
        </select>
    </div>
</BaseInput>

<style>
    .select-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .def-select {
        width: 100%;
        padding: 6px 12px;
        background: var(--bg-panel-solid);
        border: 1px solid var(--border-default);
        border-radius: 15px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        font-size: 0.9rem;
        color: var(--color-text);
        appearance: none;
        background-image: linear-gradient(45deg, transparent 50%, var(--color-text) 50%),
            linear-gradient(135deg, var(--color-text) 50%, transparent 50%);
        background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
        background-size: 5px 5px, 5px 5px;
        background-repeat: no-repeat;
    }

    .def-select:hover,
    .def-select:focus {
        background-color: var(--bg-card-hover);
        border-color: var(--border-strong);
        outline: none;
    }

    .def-select option {
        background: var(--bg-panel-solid);
        color: var(--color-text);
    }
</style>
