<script lang="ts">
    import InputText from "$lib/components/inputs/InputText.svelte";
    export interface ItemList {
        name:string,
        title?:string,
        /** Parent separated by dots, every dot add a extra space in select*/
        parent?:string | null,
        parentTitle?:string
    }
    export interface InputMultipleItemsProps{
        items:ItemList[];
        value:{name:string,parent:string|null}[];
    }
    let {items,value = $bindable()}:InputMultipleItemsProps = $props();
    if(!value){
        value = [];
    }
    let searchTo = $state('');
    function changeStateOf(name:string,parent?:string | null){
        const indexValue = value.findIndex((e)=>e.name == name && e.parent === parent);
        if(indexValue == -1){
            value.push({name,parent:parent || null});
            return
        }
        value.splice(indexValue,1);
    }
    function isHeadlessChild(actual:ItemList,befChild?:ItemList){
        if(actual.parent && !befChild){
            return true;
        }
        if(!befChild || !actual.parent){
            return false;
        }
        const lastParent = befChild.parent ?? befChild.name;
        return !actual.parent.startsWith(lastParent);
    }
    let filtredItems = $derived.by(()=>{
        if(!searchTo){
            return items;
        }
        let toTest = new RegExp(`.*${searchTo.replaceAll('.','\\.').toLowerCase()}.*`);
        return items.filter(e =>toTest.test((e.title || e.name).toLowerCase()));
    })
</script>

<div class="selectable-list">
    <InputText id='search-bar' label='Search:' bind:value={searchTo}/>
    <div class="item-list">
        {#each filtredItems as item,index(item.parent + item.name)}
            {@const subSpaces = item.parent ? (item.parent.match(new RegExp('\\.','g'))?.length ?? 0) + 1 : 0}
            {@const pre = subSpaces ? '&nbsp'.repeat(subSpaces * 3) : ''}
            {@const isHeadless = isHeadlessChild(item,filtredItems[index - 1])}
            <label>
                <input type="checkbox" onchange={()=>{changeStateOf(item.name,item.parent)}}>
            {#if isHeadless}
                <span class="parent">{item.parentTitle || item.parent}</span>
            {:else}
                {@html pre}
            {/if}
            {item.title || item.name}

            </label>
        {/each}
    </div>
</div>
<style>
    .parent{
        border: 1px solid var(--border-strong);
        background-color: var(--bg-dialog);
        color: var(--color-accent);
    }
    .item-list{
        margin-top: 5px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
    }
    label{
        background-color: var(--bg-button);
        color: var(--color-text);
        text-align: left;
        transition: background-color 0.2s, border-color 0.2s;
        border: none;
        height: 30px;
        outline: 1px solid var(--border-subtle);
    }
    label:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    label:hover {
        background-color: var(--bg-card-hover);
    }
</style>