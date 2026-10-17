<script lang="ts">
    import { onDestroy } from "svelte";


    interface Props{
        onEdit?: (item: Record<string, unknown>) => void;
        onDelete?: (item: Record<string, unknown>) => void;
        items: Record<string, unknown>[];
        /** Original Object, if passed is passed in `onEdit` and `onDelete`.
         * Attention: Ref needs to by in the same order of items
        */
        ref?:any[];
        headers: string[];
        mappedHeaders?: Record<string, string>;
        sortBy?:string;
        canEdit?: (item: Record<string, unknown>, index: number) => boolean;
        canDelete?: (item: Record<string, unknown>, index: number) => boolean;
    }
    function sort(a:unknown,b:unknown,invert = false){
        if(typeof a  === 'string' && typeof b === 'string'){
            return invertIfsetted(a.localeCompare(b));
        }
        if(typeof a === 'boolean' && typeof b === 'boolean'){
            return invertIfsetted(a ? 1 :0);
        }
        if(typeof a === 'number' && typeof b === 'number'){
            return invertIfsetted(a - b);
        }
        return 0;
        function invertIfsetted(n:number){
            return invert ? n * -1 : n;
        }
    }
    function onClickSort(header:string){
        if(sortBy == header){ 
            isInverted = !isInverted;
            
            return
        };
        sortBy = header;
        isInverted = false;
    }
    let toDelete = $state(new Set<number>());
    let itemsToDelete =$state([] as {id:number,timeLeft:number}[]);
    let interval = setInterval(()=>{
        for(const item of itemsToDelete){
            item.timeLeft -= 100;
            if(item.timeLeft <= 0){
                
                toDelete.delete(item.id);
                
                itemsToDelete = itemsToDelete.filter((e)=>e.id != item.id);
            }
        }
    },150);
    onDestroy(()=>{
        clearInterval(interval);
    })
    let { onEdit: onSelect, onDelete, items = $bindable([]), headers, mappedHeaders,ref, canEdit, canDelete }: Props = $props();
    let sortBy = $derived(headers[0]);
    let isInverted = $state(false);
    let orders = $derived(items.map<[number,unknown,boolean]>((e,i)=>[i,e[sortBy],false]).sort((a,b)=>sort(a[1],b[1],isInverted)));
</script>

<table>
    <thead>
        <tr>
            {#each headers as header}
                <th onclick={()=>onClickSort(header)}>{header} {sortBy == header ? isInverted ? '▼' : '▲' : '' }</th>
            {/each}
            <th class="actions-column"></th>
        </tr>
    </thead>
    <tbody>
        {#each orders as sortData (sortData[0])}
        {@const item = items[sortData[0]]}
        {@const index = sortData[0]}
            <tr>
                {#each headers as header}
                <td data-header={header}>{@html mappedHeaders?.[header] ? item[mappedHeaders[header]] : item[header]}</td>
                {/each}
                <td class="actions-cell" data-header="Actions">
                    {#if onSelect && (!canEdit || canEdit(ref ? ref[index] : item, index))}
                    <button type="button" onclick={() => onSelect?.(ref ? ref[index] : item)}>Edit</button>
                    {/if}
                    {#if onDelete && (!canDelete || canDelete(ref ? ref[index] : item, index))}
                        {#key itemsToDelete}
                            {@const isPendingDelete = toDelete.has(index)}
                            <button type="button" class:warn-red={isPendingDelete} onclick={() =>{
                                if(isPendingDelete){
                                    toDelete.delete(index);
                                    itemsToDelete = itemsToDelete.filter((e)=> e.id != index);
                                    onDelete(ref ? ref[index] : item);
                                    return;
                                }
                                
                                toDelete.add(index);
                                itemsToDelete = [...itemsToDelete,{id:index,timeLeft:2000}]
                                }}
                            >{isPendingDelete ? "Delete?" : "Delete"}</button>
                        {/key}
                    {/if}
                </td>
            </tr>
        {/each}
    </tbody>
</table>
<style>
    .warn-red{
        background-color: red;

    }
    .warn-red{
        background-color: red !important;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    button {
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
    .actions-column {
        width: 120px;
    }
    thead th {
        text-align: left;
        padding: 0.5rem;
        border-bottom: var(--border-subtle) 2px solid;
        font-size: 16px;
    }
    tbody td {
        padding: 0.5rem;
        border-bottom: var(--border-subtle) 1px solid;
        font-size: 14px;
    }
    tbody tr {
        transition: background-color 0.2s;
    }
    tbody tr:hover {
        background-color: var(--bg-card-hover);
    }

    @media (max-width: 640px) {
        table,
        tbody,
        tr,
        td {
            display: block;
        }

        thead {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        tbody tr {
            padding: 0.25rem 0;
            border-bottom: 2px solid var(--border-subtle);
        }

        tbody td {
            display: grid;
            grid-template-columns: minmax(7rem, 42%) minmax(0, 1fr);
            gap: 0.75rem;
            align-items: start;
            padding: 0.45rem 0.5rem;
        }

        tbody td::before {
            content: attr(data-header);
            font-weight: 600;
            color: var(--color-text-bright);
        }

        .actions-cell {
            grid-template-columns: minmax(7rem, 42%) minmax(0, 1fr);
        }

        .actions-cell button {
            margin-right: 0.35rem;
            margin-bottom: 0.2rem;
        }
    }
</style>
