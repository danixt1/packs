<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';

    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import type { Item } from "$lib/types/data/declarative";
    import { showError, showSucess } from "$lib/notify";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import { InputText, InputTextArea } from "$lib/components/inputs";
    import Form from "$lib/components/Form.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import { createContextStack } from "$lib/shared/contextStack.svelte";
    import ListVars from "$lib/components/lists/ListVars.svelte";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let items = $state(editor.getItems());

    const stack = createContextStack();

    async function startCreate() {
        const newItem = await stack.push<Partial<Item>, Item>({
            title: 'New Item',
            data: { id: '', name: '', description: '', vars: [] },
            render: renderItemForm,
            meta: { mode: 'create' }
        });

        if (newItem) {
            const cleanId = String(newItem.id ?? '').trim();
            if (editor.getObject('item:' + cleanId)) {
                showError('Item already exists');
                return;
            }
            editor.addItem({
                id: cleanId,
                name: newItem.name,
                description: newItem.description,
                vars: newItem.vars ?? []
            });
            items = editor.getItems();
            showSucess('Item created');
        }
    }

    async function startEdit(item: Record<string, any>) {
        const originalOid = item.oid as string;
        const target = $state.snapshot(item) as Item & { _baseOID?: string };
        target._baseOID = originalOid;

        const updated = await stack.push<Item & { _baseOID?: string }, Item & { _baseOID?: string }>({
            title: `Edit ${target.id}`,
            data: target,
            render: renderItemForm,
            meta: { mode: 'edit', originalId: target.id }
        });

        if (updated) {
            const cleanId = String(updated.id ?? '').trim();
            const baseOid = updated._baseOID ?? originalOid;
            if (baseOid !== 'item:' + cleanId && editor.getObject('item:' + cleanId)) {
                showError('Id already used!');
                return;
            }
            delete updated._baseOID;
            editor.updateObjectWithOid(baseOid, updated);
            items = editor.getItems();
            showSucess('Item updated');
        }
    }

    function submitItemForm() {
        const frame = stack.current;
        if (!frame) return;

        const draft = frame.draft;
        const cleanId = String(draft.id ?? '').trim();
        if (!cleanId) {
            showError('Item ID is required');
            return;
        }

        const isCreate = frame.meta?.mode === 'create';
        const targetOid = isCreate ? 'item:' + cleanId : (draft._baseOID ?? 'item:' + cleanId);

        if (isCreate && editor.getObject('item:' + cleanId)) {
            showError('Item already exists');
            return;
        }

        if (!isCreate && targetOid !== 'item:' + cleanId && editor.getObject('item:' + cleanId)) {
            showError('Id already used!');
            return;
        }

        frame.resolve({ ...draft, id: cleanId });
    }

    function cancelItemForm() {
        stack.current?.cancel();
    }
</script>

{#snippet renderItemForm(frame: any)}
    <Form onSubmit={submitItemForm} onCancel={cancelItemForm}>
        <InputText id="item-id" label="Id" bind:value={frame.draft.id} autocomplete='off' required wrapDiv/>
        <InputText id="item-name" label="Name" bind:value={frame.draft.name} autocomplete='off' required wrapDiv/>
        <InputTextArea id="item-description" label="Description" bind:value={frame.draft.description} wrapDiv/>
        <ListVars {stack} bind:values={frame.draft.vars} />
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Items</h2>
    </div>
    {#if items.length === 0}
        <p>No items To Show.</p>
    {:else}
        {@const itemsList = items.map((item) => ({
            Id: item.id,
            Name: item.name,
            Description: item.description,
            Variables: (item.vars ?? []).map((v) => `${v.name}`).join(', ')
        }))}
        <ObjectTable
            items={itemsList}
            headers={["Id", "Name", "Description", "Variables"]}
            ref={items}
            onEdit={(e) => startEdit(e)}
            onDelete={(e) => {
                const oid = e.oid as string;
                if (oid) {
                    editor.deleteObject(oid);
                    items = editor.getItems();
                }
            }}
        />
    {/if}
    <ButtonEditorCreate text="New Item" onClick={startCreate} />
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Item'} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>

<style>
</style>