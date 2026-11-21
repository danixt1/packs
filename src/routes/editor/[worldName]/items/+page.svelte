<script lang="ts">
    import { onMount } from 'svelte';
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { listenForWorldEditorContextsChanged } from "$lib/shared/worldEditorContextEvents";
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
    import ContextMembershipInput from "$lib/components/editor/ContextMembershipInput.svelte";

    type ItemFormData = Item & {
        oid?: string;
        _baseOID?: string;
        _contextPaths: string[];
        _variableContexts: Record<string, string[]>;
    };

    let editor = getCurrentWorldEditor(page.params.worldName);
    let items = $state(editor.getItems());

    const stack = createContextStack();

    onMount(() => listenForWorldEditorContextsChanged(page.params.worldName ?? '', () => {
        items = editor.getItems();
    }));

    async function startCreate() {
        const newItem = await stack.push<ItemFormData, ItemFormData>({
            title: 'New Item',
            data: { id: '', name: '', description: '', vars: [], _contextPaths: [], _variableContexts: {} },
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
            editor.setObjectContexts('item', newItem.name, newItem._contextPaths);
            editor.syncVariableContexts(newItem.vars.map((variable) => variable.name), newItem._variableContexts);
            items = editor.getItems();
            showSucess('Item created');
        }
    }

    async function startEdit(item: Record<string, any>) {
        const originalOid = item.oid as string;
        const original = editor.getObject(originalOid) as Item | undefined;
        if (!original) return;
        const target = $state.snapshot({ ...original, oid: originalOid }) as ItemFormData;
        target._baseOID = originalOid;
        target._contextPaths = editor.getObjectContexts('item', target.name);
        target._variableContexts = Object.fromEntries(target.vars.map((variable) => [
            variable.name,
            editor.getVariableContexts(variable.name)
        ]));

        const updated = await stack.push<ItemFormData, ItemFormData>({
            title: `Edit ${target.id}`,
            data: target,
            render: renderItemForm,
            meta: { mode: 'edit', originalId: target.id }
        });

        if (updated) {
            const cleanId = String(updated.id ?? '').trim();
            const previousObject = editor.getObject(originalOid) as Item | undefined;
            const baseOid = updated._baseOID ?? originalOid;
            if (baseOid !== 'item:' + cleanId && editor.getObject('item:' + cleanId)) {
                showError('Id already used!');
                return;
            }
            const { _baseOID: _ignoredBaseOID, _contextPaths, _variableContexts, oid: _ignoredOid, ...itemData } = updated;
            itemData.id = cleanId;
            editor.updateObjectWithOid(baseOid, itemData);
            editor.setObjectContexts('item', itemData.name, _contextPaths, previousObject?.name ?? itemData.name);
            editor.syncVariableContexts(
                itemData.vars.map((variable) => variable.name),
                _variableContexts,
                target.vars.map((variable) => variable.name)
            );
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
        <ContextMembershipInput id="item-contexts" label="Object contexts:" contexts={editor.getContexts()} appliesTo="objects" bind:value={frame.draft._contextPaths} />
        <ListVars {stack} bind:values={frame.draft.vars} contextEditor={editor} bind:variableContextPaths={frame.draft._variableContexts} />
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
