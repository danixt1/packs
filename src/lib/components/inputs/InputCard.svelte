<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        label?: string;
        wrapDiv?: boolean;
        items: {value:string,title:string}[];
        selectedItems?: string[];
    }
    let { id, label, wrapDiv, items,selectedItems = $bindable([]) }: Props = $props();
    function updateChecked(name:string){
        if(selectedItems.includes(name)){
            selectedItems = selectedItems.filter((e) => e != name)
            return
        }
        selectedItems.push(name);
    }
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
    <div class = "cards">
        {#each items as item (item.value)}
            <div class="card">
                <input type="checkbox" id={item.value} checked={selectedItems.includes(item.value)} onchange={()=>updateChecked(item.value)} />
                <label for={item.value}>{item.title}</label>
            </div>
        {/each}
    </div>
</BaseInput>
<style>
    .cards{
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .card{
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-subtle);
        border-radius: 50%;
        background-color: var(--bg-panel-solid);
    }
    .card input[type="checkbox"] {
        margin-right: 0.5rem;
    }
</style>