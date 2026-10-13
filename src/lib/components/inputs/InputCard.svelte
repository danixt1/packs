<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        label: string;
        wrapDiv?: boolean;
        items: {value:string,title:string}[];
        selectedItems: string[];
        onChange?:(prop:string,isChecked:boolean)=>void
    }
    let { id, label, wrapDiv, items,selectedItems = $bindable(),onChange = ()=>{} }: Props = $props();
    // In case of object with the property not declared
    if(!selectedItems){
        selectedItems = [];
    }
    function updateChecked(name:string){
        if(selectedItems.includes(name)){
            selectedItems = selectedItems.filter((e) => e != name)
            onChange(name,false)
            return
        }
        selectedItems = [...selectedItems, name];
        onChange(name,true)
    }
</script>
<BaseInput {id} {wrapDiv}>
    <fieldset class="cards" {id} data-testid={`input-${id}`}>
        <legend class="def-label">{label}</legend>
        <div class="list">
            {#each items as item (item.value)}
                <label class:selected={selectedItems.includes(item.value)} class="card-label">
                    <input type="checkbox" id={item.value} class="card-checkbox" checked={selectedItems.includes(item.value)} onchange={()=>updateChecked(item.value)} />
                    {item.title}
                </label>
            {/each}
        </div>
    </fieldset>
</BaseInput>
<style>
    .list{
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }
    .cards{
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        flex-direction: column;
        border: 0;
        margin: 0;
        padding: 0;
    }
    .card-checkbox {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }
    .card-label {
        display: flex;
        flex-direction: column;
        background: var(--bg-panel-solid);
        border: 1px solid var(--border-default);
        border-radius: 15px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        padding: 6px 10px;
    }
        .card-label.selected {
      background-color: var(--bg-card-hover);
    }

        .card-label.selected {
        color: var(--color-text)
    }
</style>