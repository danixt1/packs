<script lang="ts">

    interface Props{
        onEdit: (item: Record<string, unknown>) => void;
        onDelete: (item: Record<string, unknown>) => void;
        items: Record<string, unknown>[];
        /** Original Object, if passed is passed in `onEdit` and `onDelete`.
         * Attention: Ref needs to by in the same order of items
        */
        ref?:any[];
        headers: string[];
        mappedHeaders?: Record<string, string>;
    }
    let { onEdit: onSelect, onDelete, items = $bindable([]), headers, mappedHeaders,ref }: Props = $props();
</script>

<table>
    <thead>
        <tr>
            {#each headers as header}
                <th>{header}</th>
            {/each}
            <th class="actions-column"></th>
        </tr>
    </thead>
    <tbody>
        {#each items as item,index}
            <tr>
                {#each headers as header}
                    <td data-header={header}>{mappedHeaders?.[header] ? item[mappedHeaders[header]] : item[header]}</td>
                {/each}
                <td class="actions-cell" data-header="Actions">
                    <button onclick={() => onSelect(ref ? ref[index] : item)}>Edit</button>
                    <button onclick={() => onDelete(ref ? ref[index] : item)}>Delete</button>
                </td>
            </tr>
        {/each}
    </tbody>
</table>
<style>
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
