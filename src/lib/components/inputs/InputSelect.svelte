<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        label: string;
        wrapDiv?: boolean;
        items: {value:any, title:string}[];
        selected: any;
        disabled?:boolean;
        onchange?: (event: Event) => void;
    }
    let { id, label, wrapDiv, items, selected = $bindable(), disabled, onchange }: Props = $props();
    
</script>

<BaseInput {id} {label} {wrapDiv}>
    <select {id} data-testid={`input-${id}`} bind:value={selected} class="def-select" disabled={disabled} {onchange}>
        {#each items as item (item.value)}
            <option value={item.value}>{item.title}</option>
        {/each}
    </select>
</BaseInput>

<style>
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
