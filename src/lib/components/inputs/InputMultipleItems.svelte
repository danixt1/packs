<script lang="ts">
    export interface ItemList {
        name:string,
        title?:string,
        /** Parent separated by dots, every dot add a extra space in select*/
        parent?:string | null,
        parentTitle?:string
    }
    export interface ItemSelection {
        name:string;
        parent:string | null;
    }
    export interface InputMultipleItemsProps{
        items:ItemList[];
        value:ItemSelection[];
        id?:string;
        label?:string;
        placeholder?:string;
        onchange?:(value:ItemSelection[])=>void;
    }
    let {items,value = $bindable([]),id='multiple-items',label='Search items',placeholder='Search...',onchange}:InputMultipleItemsProps = $props();
    if(!value){
        value = [];
    }
    let searchTo = $state('');
    function isSelected(item:ItemList){
        return value.some((selected) => selected.name === item.name && selected.parent === (item.parent ?? null));
    }
    function getItemPath(item:ItemList){
        return item.parent ? `${item.parent}.${item.name}` : item.name;
    }
    function changeStateOf(item:ItemList,checked:boolean){
        const selection = { name:item.name, parent:item.parent ?? null };
        const next = checked
            ? [...value, selection]
            : value.filter((selected) => selected.name !== selection.name || selected.parent !== selection.parent);
        value = next;
        onchange?.(next);
    }
    let filteredItems = $derived.by(()=>{
        if(!searchTo){
            return items;
        }
        const query = searchTo.trim().toLowerCase();
        return items.filter((item) =>
            `${item.title || item.name} ${item.name} ${item.parent || ''}`.toLowerCase().includes(query)
        );
    })
    let visibleItemPaths = $derived(new Set(filteredItems.map(getItemPath)));
</script>

<div class="selectable-list">
    <div class="search-control">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.2 4.2" />
        </svg>
        <input
            id={`${id}-search`}
            data-testid={`input-${id}-search`}
            class="search-input"
            type="search"
            bind:value={searchTo}
            aria-label={label}
            {placeholder}
            autocomplete="off"
        />
    </div>
    <div class="item-list">
        {#each filteredItems as item (item.parent ? `${item.parent}.${item.name}` : item.name)}
            {@const depth = item.parent ? item.parent.split('.').length : 0}
            <label class="item-option" style={`--item-depth:${depth}`}>
                <input type="checkbox" checked={isSelected(item)} onchange={(event) => changeStateOf(item,event.currentTarget.checked)}>
                <span class="item-title">
                    {#if item.parent && !visibleItemPaths.has(item.parent)}
                        <span class="parent">{item.parentTitle || item.parent}</span>
                    {/if}
                    {item.title || item.name}
                </span>
            </label>
        {/each}
        {#if filteredItems.length === 0}
            <p class="empty-results">No matching items.</p>
        {/if}
    </div>
</div>
<style>
    .search-control {
        position: relative;
        width: min(100%, 20rem);
    }
    .search-icon {
        position: absolute;
        top: 50%;
        left: 0.65rem;
        width: 0.9rem;
        height: 0.9rem;
        fill: none;
        stroke: var(--color-accent-dim);
        stroke-linecap: round;
        stroke-width: 1.8;
        transform: translateY(-50%);
        pointer-events: none;
    }
    .search-input {
        box-sizing: border-box;
        width: 100%;
        height: 2rem;
        padding: 0.35rem 0.65rem 0.35rem 2rem;
        border: 1px solid var(--border-subtle);
        border-radius: 999px;
        background: rgba(7, 9, 12, 0.3);
        color: var(--color-text);
        font: inherit;
        font-size: 0.82rem;
        transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
    }
    .search-input::placeholder {
        color: var(--color-accent-dim);
        opacity: 0.8;
    }
    .search-input:focus-visible {
        border-color: var(--color-accent);
        background: var(--bg-panel-solid);
        outline: none;
        box-shadow: 0 0 0 2px rgba(215, 177, 115, 0.2);
    }
    .parent{
        border: 1px solid var(--border-strong);
        background-color: var(--bg-dialog);
        color: var(--color-accent);
    }
    .item-list{
        margin-top: 5px;
        max-height: 14rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .item-option{
        background-color: var(--bg-button);
        color: var(--color-text);
        text-align: left;
        transition: background-color 0.2s, border-color 0.2s;
        border: none;
        min-height: 2rem;
        padding: 0.25rem 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-left: calc(0.5rem + var(--item-depth) * 1rem);
    }
    .item-option:focus-within {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .item-option:hover {
        background-color: var(--bg-card-hover);
    }
    .item-title {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }
    .empty-results {
        margin: 0;
        padding: 0.5rem;
        color: var(--color-accent-dim);
    }
</style>
