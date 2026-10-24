<script lang="ts" generics="T">
    interface ListItem<T> {
        id: number;
        value: T;
    }

    interface Props<T> {
        values?: T[];
        getLabel: (value: T, index: number) => string;
        onEdit?: (value: T, index: number) => void;
        onDelete?: (value: T, index: number) => void;
        onReorder?: (values: T[]) => void;
        validateChange?: (values: T[]) => boolean;
        onInvalidChange?: (message: string) => void;
        invalidChangeMessage?: string;
        emptyText?: string;
    }

    let {
        values = $bindable<T[]>([]),
        getLabel,
        onEdit,
        onDelete,
        onReorder,
        validateChange,
        onInvalidChange,
        invalidChangeMessage = 'That change would make the list invalid.',
        emptyText = 'No items yet.'
    }: Props<T> = $props();

    let nextId = 0;
    let items = $state<ListItem<T>[]>([]);
    let dragIndex = $state<number | null>(null);
    let overIndex = $state<number | null>(null);

    $effect(() => {
        const incoming = values ?? [];
        const current = items.map((item) => item.value);
        if (JSON.stringify($state.snapshot(current)) === JSON.stringify(incoming)) {
            return;
        }
        items = incoming.map((value) => ({ id: nextId++, value }));
    });

    function setItems(next: ListItem<T>[]) {
        items = next;
        values = next.map((item) => item.value);
    }

    function isValidChange(next: ListItem<T>[]): boolean {
        if (!validateChange) {
            return true;
        }
        return validateChange(next.map((item) => item.value));
    }

    function reportInvalidChange() {
        onInvalidChange?.(invalidChangeMessage);
    }

    function removeItem(index: number) {
        const next = items.filter((_, itemIndex) => itemIndex !== index);
        if (!isValidChange(next)) {
            reportInvalidChange();
            return;
        }
        const removed = items[index]?.value;
        setItems(next);
        if (removed !== undefined) {
            onDelete?.(removed, index);
        }
    }

    function onDragStart(index: number, event: DragEvent) {
        dragIndex = index;
        event.dataTransfer?.setData('text/plain', String(index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(index: number, event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        overIndex = index;
    }

    function onDrop(index: number, event: DragEvent) {
        event.preventDefault();
        if (dragIndex === null || dragIndex === index) {
            dragIndex = null;
            overIndex = null;
            return;
        }

        const next = [...items];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(index, 0, moved);
        if (!isValidChange(next)) {
            reportInvalidChange();
            dragIndex = null;
            overIndex = null;
            return;
        }

        setItems(next);
        onReorder?.(next.map((item) => item.value));
        dragIndex = null;
        overIndex = null;
    }

    function onDragEnd() {
        dragIndex = null;
        overIndex = null;
    }
</script>

{#if items.length === 0}
    <p class="empty">{emptyText}</p>
{:else}
    <ul class="items">
        {#each items as item, index (item.id)}
            <li
                data-testid={'orderedlist-item-' + index}
                class="item"
                class:dragging={dragIndex === index}
                class:over={overIndex === index && dragIndex !== index}
                draggable="true"
                ondragstart={(event) => onDragStart(index, event)}
                ondragover={(event) => onDragOver(index, event)}
                ondrop={(event) => onDrop(index, event)}
                ondragend={onDragEnd}
            >
                <span class="grip" aria-hidden="true">⠿</span>
                <span class="label">{@html getLabel(item.value, index)}</span>
                <span class="actions">
                    {#if onEdit}
                        <button data-testid={'orderedlist-button-edit-'+index} type="button" onclick={() => onEdit?.(item.value, index)}>Edit</button>
                    {/if}
                    <button data-testid={'orderedlist-button-delete-'+index} type="button" onclick={() => removeItem(index)}>Delete</button>
                </span>
            </li>
        {/each}
    </ul>
{/if}

<style>
    .empty {
        color: var(--color-text);
        opacity: 0.7;
        font-size: 0.9rem;
    }
    .items {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        background: var(--bg-panel-solid);
        transition: background-color 0.2s, border-color 0.2s;
    }
    .item.dragging {
        opacity: 0.5;
    }
    .item.over {
        border-color: var(--color-accent);
        background-color: var(--bg-card-hover);
    }
    .grip {
        cursor: grab;
        opacity: 0.5;
        user-select: none;
    }
    .label {
        flex: 1;
        font-size: 0.9rem;
        word-break: break-word;
    }
    .actions {
        display: flex;
        gap: 0.25rem;
    }
    button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.15rem 0.45rem;
        cursor: pointer;
        font-size: 0.8rem;
    }
    button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>
