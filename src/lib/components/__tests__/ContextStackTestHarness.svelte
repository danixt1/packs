<script lang="ts">
    import { createContextStack } from "$lib/shared/contextStack.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import Form from "$lib/components/Form.svelte";
    import { InputText } from "$lib/components/inputs";
    import { showError } from "$lib/notify";

    interface Item {
        id: string;
        name: string;
    }

    interface Props {
        initialItems?: Item[];
    }

    let { initialItems = [] }: Props = $props();

    let items = $state<Item[]>([]);
    $effect.pre(() => {
        if (items.length === 0 && initialItems.length > 0) {
            items = [...initialItems];
        }
    });
    const stack = createContextStack();

    async function startCreate() {
        const newItem = await stack.push<Partial<Item>, Item>({
            title: 'New Item',
            data: { id: '', name: '' },
            render: renderFormSnippet,
            meta: {
                mode: 'create',
                existingIds: items.map((i) => i.id)
            }
        });

        if (newItem) {
            items = [...items, newItem];
        }
    }

    async function startEdit(index: number) {
        const target = items[index];
        const updated = await stack.push<Item, Item>({
            title: `Edit ${target.id}`,
            data: target,
            render: renderFormSnippet,
            meta: {
                mode: 'edit',
                originalId: target.id,
                existingIds: items.filter((_, i) => i !== index).map((i) => i.id)
            }
        });

        if (updated) {
            items = items.map((item, i) => (i === index ? updated : item));
        }
    }

    function handleFormSubmit() {
        const frame = stack.current;
        if (!frame) return;

        const draft = frame.draft;
        const trimmedId = String(draft.id ?? '').trim();

        if (!trimmedId) {
            showError('ID cannot be empty');
            return;
        }

        // Collision check against frame meta
        if (frame.meta?.existingIds?.includes(trimmedId)) {
            showError(`ID "${trimmedId}" is already taken`);
            return;
        }

        frame.resolve({
            id: trimmedId,
            name: String(draft.name ?? '').trim()
        });
    }

    function handleFormCancel() {
        stack.current?.cancel();
    }
</script>

{#snippet renderFormSnippet(frame: any)}
    <div data-testid="form-view" data-frame-id={frame.id}>
        <h4>{frame.title}</h4>
        <Form onSubmit={handleFormSubmit} onCancel={handleFormCancel}>
            <InputText
                id="item-id"
                label="Item ID:"
                bind:value={frame.draft.id}
            />
            <InputText
                id="item-name"
                label="Item Name:"
                bind:value={frame.draft.name}
            />
        </Form>
    </div>
{/snippet}

<div class="test-harness">
    <ContextHost {stack}>
        {#if stack.depth === 0}
            <div data-testid="list-view">
                <h3>Items List</h3>
                <ul>
                    {#each items as item, index (item.id)}
                        <li data-testid={`item-row-${item.id}`}>
                            <span>{item.id} - {item.name}</span>
                            <button
                                type="button"
                                data-testid={`edit-btn-${item.id}`}
                                onclick={() => startEdit(index)}
                            >
                                Edit
                            </button>
                        </li>
                    {/each}
                </ul>
                <button type="button" data-testid="create-btn" onclick={startCreate}>
                    Add Item
                </button>
            </div>
        {/if}
    </ContextHost>
</div>
