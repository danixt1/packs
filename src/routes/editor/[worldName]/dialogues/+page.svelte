<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import type { DialogueChoice, DialogueMatch, DialogueNode, DialogueTree } from "$lib/types/data/declarative";

    import { InputCard, InputSelect, InputSwitch, InputText, InputTextArea } from "$lib/components/inputs";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import Form from "$lib/components/Form.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import ListConditions from "$lib/components/lists/ListConditions.svelte";
    import ListEffects from "$lib/components/lists/ListEffects.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import { createContextStack } from "$lib/shared/contextStack.svelte";
    import { showError, showSucess } from "$lib/notify";
    import ButtonPopUp from "$lib/components/editor/ButtonPopUp.svelte";

    const editor = getCurrentWorldEditor(page.params.worldName);
    let dialogues = $state(editor.getDialogues());
    const stack = createContextStack();
    let labelsInfo = $state(editor.getLabels());

    function emptyDialogue(): Record<string, any> {
        return {
            id: '',
            name: '',
            intent: '',
            priority: 0,
            startsAt: '',
            categories: [],
            nodes: []
        };
    }

    async function startCreate() {
        const result = await stack.push<any, any>({
            title: 'Create Dialogue Tree',
            data: emptyDialogue(),
            render: renderDialogueForm,
            meta: { mode: 'create' }
        });

        if (result) {
            handleSaveDialogue(result, null);
        }
    }

    async function startEdit(dialogue: Record<string, any>) {
        const originalOid = dialogue.oid as string;
        const initial = $state.snapshot(dialogue);

        const result = await stack.push<any, any>({
            title: `Edit ${initial.name || initial.id}`,
            data: initial,
            render: renderDialogueForm,
            meta: { mode: 'edit', originalOid }
        });

        if (result) {
            handleSaveDialogue(result, originalOid);
        }
    }

    function handleSaveDialogue(data: Record<string, any>, originalOid: string | null) {
        if (!data.id || !data.name || !data.intent) {
            showError('Id, name, and dialogue purpose are required');
            return;
        }

        const newOid = `dialogue:${data.id}`;
        if ((!originalOid || originalOid !== newOid) && editor.getObject(newOid)) {
            showError('Dialogue id already exists');
            return;
        }

        if (originalOid) {
            editor.updateObjectWithOid(originalOid, data);
            showSucess('Dialogue updated');
        } else {
            const tree: DialogueTree = {
                type: 'dialogue-tree',
                id: data.id,
                name: data.name,
                intent: data.intent,
                priority: data.priority ?? 0,
                categories: data.categories ?? [],
                match: data.match,
                startsAt: data.startsAt ?? data.nodes?.[0]?.id ?? '',
                nodes: data.nodes ?? []
            };
            editor.addDialogue(tree);
            showSucess('Dialogue created');
        }
        dialogues = editor.getDialogues();
    }

    async function openMatch(parentFrame: any) {
        const initial = $state.snapshot(parentFrame.draft.match ?? {});
        initial.targetCharacterIds ??= [];
        initial.conditions ??= [];

        const updated = await stack.push<any, any>({
            title: 'Configure Matching Rules',
            data: initial,
            render: renderMatchForm
        });

        if (updated) {
            delete updated._in;
            delete updated._label;
            parentFrame.draft.match = updated as DialogueMatch;
        }
    }

    async function openNode(parentFrame: any, node?: DialogueNode) {
        const initial = node ? $state.snapshot(node) : { id: '', text: '', speaker: 'target', onEnter: [], choices: [] };
        initial.onEnter ??= [];
        initial.choices ??= [];

        const updated = await stack.push<any, any>({
            title: node ? `Edit Node (${node.id})` : 'Add Node',
            data: initial,
            render: renderNodeForm
        });

        if (updated) {
            if (!updated.id || !updated.text || !updated.speaker) {
                showError('Node id, text, and speaker are required');
                return;
            }
            const nodes = [...(parentFrame.draft.nodes ?? [])] as DialogueNode[];
            const index = node ? nodes.findIndex((item) => item.id === node.id) : -1;
            if (index >= 0) {
                nodes[index] = updated;
            } else {
                nodes.push(updated);
            }
            parentFrame.draft.nodes = nodes;
            if (!parentFrame.draft.startsAt) {
                parentFrame.draft.startsAt = updated.id;
            }
        }
    }

    function deleteNode(parentFrame: any, node: DialogueNode) {
        parentFrame.draft.nodes = (parentFrame.draft.nodes ?? []).filter((item: DialogueNode) => item.id !== node.id);
        if (parentFrame.draft.startsAt === node.id) {
            parentFrame.draft.startsAt = parentFrame.draft.nodes[0]?.id ?? '';
        }
    }

    async function openChoice(nodeFrame: any, choice?: DialogueChoice) {
        const initial = choice ? $state.snapshot(choice) : { id: '', text: '', conditions: [], effects: [], endDialogue: false };
        initial.conditions ??= [];
        initial.effects ??= [];

        const updated = await stack.push<any, any>({
            title: choice ? `Edit Choice (${choice.id})` : 'Add Choice',
            data: initial,
            render: renderChoiceForm
        });

        if (updated) {
            if (!updated.id || !updated.text) {
                showError('Choice id and text are required');
                return;
            }
            const choices = [...(nodeFrame.draft.choices ?? [])] as DialogueChoice[];
            const index = choice ? choices.findIndex((item) => item.id === choice.id) : -1;
            if (index >= 0) {
                choices[index] = updated;
            } else {
                choices.push(updated);
            }
            nodeFrame.draft.choices = choices;
        }
    }

    function updateMatchLabels(matchDraft: any, key: string, label: string, isChecked: boolean) {
        const current = Array.isArray(matchDraft[key]) ? matchDraft[key] : [];
        matchDraft[key] = isChecked
            ? [...current, label]
            : current.filter((value: string) => value !== label);
    }
</script>

{#snippet renderDialogueForm(frame: any)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <InputText id="dial-id" label="Id" bind:value={frame.draft.id} required wrapDiv autocomplete="off" />
        <InputText id="dial-name" label="Name" bind:value={frame.draft.name} required wrapDiv autocomplete="off" />
        <InputText id="dial-intent" label="Dialogue Purpose" bind:value={frame.draft.intent} required wrapDiv autocomplete="off" />
        <InputText id="dial-start" label="Starts At" bind:value={frame.draft.startsAt} wrapDiv autocomplete="off" />
        <div class="form-group">
            <h2>Nodes</h2>
            <ObjectTable
                items={(frame.draft.nodes ?? []).map((node: DialogueNode) => ({ Id: node.id, Text: node.text }))}
                headers={['Id', 'Text']}
                ref={frame.draft.nodes ?? []}
                onEdit={(node) => openNode(frame, node as unknown as DialogueNode)}
                onDelete={(node) => deleteNode(frame, node as unknown as DialogueNode)}
            />
            <button type="button" onclick={() => openNode(frame)}>Add Node</button>
        </div>
        <div class="form-group">
            <ButtonPopUp text="Configure matching rules" onclick={() => openMatch(frame)}/>
        </div>
    </Form>
{/snippet}

{#snippet renderNodeForm(frame: any)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <div class="form-group">
            <InputText id="node-id" label="Node Id" bind:value={frame.draft.id} required autocomplete="off" />
            <InputTextArea id="node-text" label="Node Text" bind:value={frame.draft.text} required />
            <InputSelect id="speaker-options" label="Speaker" bind:selected={frame.draft.speaker} items={[
                { title: 'Target Character', value: 'target' },
                { title: 'Self Character', value: 'self' },
                { title: 'Narrator', value: 'narrator' },
                ...editor.getCharacters().map((character) => ({ title: `char:${character.name} (${character.id})`, value: { type: 'character', id: character.id } }))
            ]} />
            <h2>On enter effects:</h2>
            <ListEffects {stack} bind:values={frame.draft.onEnter} />
            <h2>Choices:</h2>
            {#if (frame.draft.choices || []).length > 0}
                <ObjectTable
                    items={(frame.draft.choices ?? []).map((e: any) => ({ Id: e.id, Text: e.text, Next: e.nextNodeId }))}
                    headers={['Id','Text','Next']}
                    ref={frame.draft.choices ?? []}
                    onEdit={(e) => openChoice(frame, e as unknown as DialogueChoice)}
                    onDelete={(e) => { frame.draft.choices = frame.draft.choices.filter((n: any) => e.id !== n.id); }}
                />
            {:else}
                <p>No Choices Added!</p>
            {/if}
            <ButtonPopUp text="Add Choice" onclick={() => openChoice(frame)} />
        </div>
    </Form>
{/snippet}

{#snippet renderChoiceForm(frame: any)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <InputText id="choice-id" label="Id:" bind:value={frame.draft.id} autocomplete='off' wrapDiv />
        <InputTextArea id="choice-text" label="Text:" bind:value={frame.draft.text} wrapDiv required />
        <InputText id="choice-next-node" label="Next node:" bind:value={frame.draft.nextNodeId} autocomplete="off" wrapDiv />
        <InputSwitch id="choice-end-dialogue" label="End dialogue" bind:value={frame.draft.endDialogue} wrapDiv />
        <div class="form-group">
            <h2>Conditions</h2>
            <ListConditions {stack} bind:values={frame.draft.conditions} />
        </div>
        <div class="form-group">
            <h2>Choice effects</h2>
            <ListEffects {stack} bind:values={frame.draft.effects} />
        </div>
    </Form>
{/snippet}

{#snippet renderMatchForm(frame: any)}
    {@const itemChars = editor.getCharacters().map((character) => ({ value: character.id, title: `${character.name} (${character.id})` }))}
    {@const itemLabels = labelsInfo.map((label) => ({ value: label.name, title: label.title || label.name }))}
    {@const selectedKey = frame.draft._in && frame.draft._label ? `${frame.draft._in}Labels${frame.draft._label}` : ''}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <div class="form-group">
            <div class="info">
                <p>Set a <b>priority</b> when configuring matching rules. It is also a good idea to create a fallback dialogue without matching rules.</p>
            </div>
            <InputCard items={itemChars} id="match-targets" label="Available only for these characters:" bind:selectedItems={frame.draft.targetCharacterIds} />
            <h2>Label rules</h2>
            <div class="info">
                <p>Define which labels the target and speaking character must have for this dialogue tree to be available.</p>
            </div>
            <div class="in-label">
                <InputSelect id="match-in" label="Apply labels to:" items={[{ title: 'Target', value: 'target' }, { title: 'Self', value: 'self' }]} bind:selected={frame.draft._in} />
                <InputSelect id="match-label" label="Filter type:" items={[{ title: 'Any', value: 'Any' }, { title: 'All', value: 'All' }, { title: 'None', value: 'None' }]} bind:selected={frame.draft._label} />
            </div>
            {#if selectedKey}
                {#key selectedKey}
                    <InputCard
                        items={itemLabels}
                        id={`match-${selectedKey}`}
                        label="Select labels:"
                        selectedItems={frame.draft[selectedKey] ?? []}
                        onChange={(label, isChecked) => updateMatchLabels(frame.draft, selectedKey, label, isChecked)}
                    />
                {/key}
            {/if}
            <h2>Conditions</h2>
            <ListConditions {stack} bind:values={frame.draft.conditions} />
        </div>
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Dialogues</h2>
    </div>
    {#if dialogues.length === 0}
        <p>No dialogue trees have been added yet.</p>
    {:else}
        {@const dialoguesShow = dialogues.map((dialogue) => ({
            Id: dialogue.id,
            Name: dialogue.name,
            Nodes: dialogue.nodes.length
        }))}
        <ObjectTable
            items={dialoguesShow}
            headers={['Id', 'Name', 'Nodes']}
            ref={dialogues}
            onEdit={(dialogue) => startEdit(dialogue)}
            onDelete={(dialogue) => {
                editor.deleteObject(dialogue.oid as string);
                dialogues = editor.getDialogues();
            }}
        />
    {/if}
    <ButtonEditorCreate text="Create Dialogue Tree" onClick={startCreate} />
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Dialogue'} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>

<style>
    .in-label {
        display: flex;
        padding: 10px 0 4px;
    }
    .info {
        border: 1px solid var(--border-default);
        border-left: 4px solid var(--border-default);
        padding: 3px 5px;
    }
    button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.5rem 1rem;
    }
</style>
