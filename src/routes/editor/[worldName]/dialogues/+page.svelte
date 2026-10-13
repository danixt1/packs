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
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import { showError } from "$lib/notify";
    import ButtonPopUp from "$lib/components/editor/ButtonPopUp.svelte";

    const editor = getCurrentWorldEditor(page.params.worldName);
    let dialogues = $state(editor.getDialogues());
    let openPopup = $state(false);
    let data = $state<Record<string, any>>({});
    let nodeData = $state<Record<string, any>>({});
    let matchData = $state<Record<string, any>>({});
    let choiceData = $state<Record<string,any>>({});

    const nodeOnEnterScope = 'dialogue-node-on-enter-effects';
    const choiceEffectsScope = 'dialogue-choice-effects';

    let switcher = $state(createPageSwitch());
    let dialoguePage = (() => switcher.createSwitch({
        form: {
            onSubmit: () => saveDialogue(),
            onCancel: () => openPopup = false
        }
    }))();
    let matchPage = (() => switcher.createSwitch({
        form: {
            onSubmit: () => saveMatch(),
            onCancel: () => dialoguePage.enablePage()
        }
    }))();
    let nodePage = (() => switcher.createSwitch({
        form: {
            onSubmit: () => saveNode(),
            onCancel: () => dialoguePage.enablePage()
        }
    }))();
    let choicePage = (()=>switcher.createSwitch({
        form: {
            onSubmit:saveChoice,
            onCancel: ()=> nodePage.enablePage()
        }
    }))()
    let nodeOnEnterPage = (() => switcher.createSwitch({
        in: { type: 'list', name: 'effect', scope: nodeOnEnterScope },
        form: {}
    }, nodeOnEnterScope))();
    let choiceEffectsPage = (() => switcher.createSwitch({
        in: { type: 'list', name: 'effect', scope: choiceEffectsScope },
        form: {}
    }, choiceEffectsScope))();
    let labelsInfo = $state(editor.getLabels());
    let selectedLabelKey = $derived(
        matchData._in && matchData._label
            ? `${matchData._in}Labels${matchData._label}`
            : ''
    );

    $effect(() => {
        if (selectedLabelKey && !Array.isArray(matchData[selectedLabelKey])) {
            matchData[selectedLabelKey] = [];
        }
    });

    function startCreate() {
        data = { nodes: [] };
        openPopup = true;
        dialoguePage.enablePage();
    }

    function startEdit(dialogue: Record<string, any>) {
        data = $state.snapshot(dialogue);
        data._baseOID = dialogue.oid;
        openPopup = true;
        dialoguePage.enablePage();
    }

    function saveDialogue() {
        if (!data.id || !data.name || !data.intent) {
            showError('Id, name, and dialogue purpose are required');
            return;
        }
        if (data._baseOID) {
            if (data._baseOID !== `dialogue:${data.id}` && editor.getObject(`dialogue:${data.id}`)) {
                showError('Dialogue id already exists');
                return;
            }
            editor.updateObjectWithOid(data._baseOID, data);
        } else {
            if (editor.getObject(`dialogue:${data.id}`)) {
                showError('Dialogue id already exists');
                return;
            }
            const dialogue: DialogueTree = {
                type: 'dialogue-tree',
                id: data.id,
                name: data.name,
                intent: data.intent,
                priority: data.priority,
                categories: data.categories ?? [],
                match: data.match,
                startsAt: data.startsAt ?? data.nodes?.[0]?.id ?? '',
                nodes: data.nodes ?? []
            };
            editor.addDialogue(dialogue);
        }
        dialogues = editor.getDialogues();
        openPopup = false;
    }

    function saveMatch() {
        const match: DialogueMatch = {
            targetCharacterIds: matchData.targetCharacterIds ?? [],
            targetLabelsAny: matchData.targetLabelsAny ?? [],
            targetLabelsAll: matchData.targetLabelsAll ?? [],
            targetLabelsNone: matchData.targetLabelsNone ?? [],
            selfLabelsAny: matchData.selfLabelsAny ?? [],
            selfLabelsAll: matchData.selfLabelsAll ?? [],
            selfLabelsNone: matchData.selfLabelsNone ?? [],
            conditions: matchData.conditions ?? []
        };
        data.match = match;
        dialoguePage.enablePage();
    }

    function openMatch() {
        matchData = $state.snapshot(data.match ?? {});
        matchPage.enablePage();
    }

    function saveNode() {
        if (!nodeData.id || !nodeData.text || !nodeData.speaker) {
            showError('Node id, text, and speaker are required');
            return;
        }
        const node: DialogueNode = {
            id: nodeData.id,
            speaker: nodeData.speaker,
            text: nodeData.text,
            choices: nodeData.choices ?? [],
            onEnter: nodeData.onEnter ?? []
        };
        const nodes = [...(data.nodes ?? [])] as DialogueNode[];
        const index = nodes.findIndex((item) => item.id === node.id);
        if (index >= 0) {
            nodes[index] = node;
        } else {
            nodes.push(node);
        }
        data.nodes = nodes;
        if (!data.startsAt) {
            data.startsAt = node.id;
        }
        dialoguePage.enablePage();
    }
    function openNode(node?: DialogueNode) {
        nodeData = node ? $state.snapshot(node) : {};
        nodeData.onEnter ??= [];
        
        nodePage.enablePage();
    }

    function openChoice(choice?: DialogueChoice) {
        choiceData = choice ? $state.snapshot(choice) : { conditions: [], effects: [] };
        choiceData.conditions ??= [];
        choiceData.effects ??= [];
        choicePage.enablePage();
    }

    function saveChoice() {
        if (!choiceData.id || !choiceData.text) {
            showError('Choice id and text are required');
            return;
        }
        const choice: DialogueChoice = {
            id: choiceData.id,
            text: choiceData.text,
            conditions: choiceData.conditions ?? [],
            effects: choiceData.effects ?? [],
            nextNodeId: choiceData.nextNodeId || undefined,
            endDialogue: choiceData.endDialogue === true
        };
        const choices = [...(nodeData.choices ?? [])] as DialogueChoice[];
        const index = choices.findIndex((item) => item.id === choice.id);
        if (index >= 0) {
            choices[index] = choice;
        } else {
            choices.push(choice);
        }
        nodeData.choices = choices;
        nodePage.enablePage();
    }

    function deleteNode(node: DialogueNode) {
        data.nodes = (data.nodes ?? []).filter((item: DialogueNode) => item.id !== node.id);
        if (data.startsAt === node.id) {
            data.startsAt = data.nodes[0]?.id ?? '';
        }
    }

    function updateMatchLabels(key: string, label: string, isChecked: boolean) {
        const current = Array.isArray(matchData[key]) ? matchData[key] : [];
        matchData[key] = isChecked
            ? [...current, label]
            : current.filter((value: string) => value !== label);
    }
</script>

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

<Popup open={openPopup} title="Dialogue">
    <Form {...switcher.data.form}>
        {#if dialoguePage.isPageEnabled}
            <InputText id="dial-id" label="Id" bind:value={data.id} required wrapDiv autocomplete="off" />
            <InputText id="dial-name" label="Name" bind:value={data.name} required wrapDiv autocomplete="off" />
            <InputText id="dial-intent" label="Dialogue Purpose" bind:value={data.intent} required wrapDiv autocomplete="off" />
            <InputText id="dial-start" label="Starts At" bind:value={data.startsAt} wrapDiv autocomplete="off" />
            <div class="form-group">
                <h2>Nodes</h2>
                <ObjectTable
                    items={(data.nodes ?? []).map((node: DialogueNode) => ({ Id: node.id, Text: node.text }))}
                    headers={['Id', 'Text']}
                    ref={data.nodes ?? []}
                    onEdit={(node) => openNode(node as unknown as DialogueNode)}
                    onDelete={(node) => deleteNode(node as unknown as DialogueNode)}
                />
                <button type="button" onclick={() => openNode()}>Add Node</button>
            </div>
            <div class="form-group">
                <ButtonPopUp text="Configure matching rules" onclick={openMatch}/>
            </div>
        {:else if nodePage.isPageEnabled}
            <div class="form-group">
                <InputText id="node-id" label="Node Id" bind:value={nodeData.id} required autocomplete="off" />
                <InputTextArea id="node-text" label="Node Text" bind:value={nodeData.text} required />
                <InputSelect id="speaker-options" label="Speaker" bind:selected={nodeData.speaker} items={[
                    { title: 'Target Character', value: 'target' },
                    { title: 'Self Character', value: 'self' },
                    { title: 'Narrator', value: 'narrator' },
                    ...editor.getCharacters().map((character) => ({ title: `char:${character.name} (${character.id})`, value: { type: 'character', id: character.id } }))
                ]} />
                <h2>On enter effects:</h2>
                <ButtonPopUp text={`Configure effects (${nodeData.onEnter?.length ?? 0})`} onclick={() => switcher.enableSwitchByName(nodeOnEnterScope)} />
                <h2>Choices:</h2>
                {#if (nodeData.choices || []).length > 0}
                    <ObjectTable items = {(nodeData.choices ?? []).map((e:any)=>({Id:e.id,Text:e.text,Next:e.nextNodeId}))}
                    headers={['Id','Text','Next']}
                    ref={nodeData.choices ?? []}
                    onEdit = {(e)=>openChoice(e as unknown as DialogueChoice)}
                    onDelete = {(e)=>{nodeData.choices = nodeData.choices.filter((n:any)=> e.id != n.id)}}
                    />
                {:else}
                    <p>No Choices Added!</p>
                {/if}
                <ButtonPopUp text="Add Choice" onclick={() => openChoice()} />
            </div>
        {:else if switcher.data.in?.type === 'list' && switcher.data.in?.scope === nodeOnEnterScope}
            <div class="form-group">
                <h2>Node entry effects</h2>
                <ListEffects
                    bind:values={nodeData.onEnter}
                    page={nodeOnEnterPage}
                    switcher={switcher}
                    onCancel={() => nodePage.enablePage()}
                    onAfterSubmit={() => nodePage.enablePage()}
                />
            </div>
        {:else}
            {#if matchPage.isPageEnabled}
                {@const itemChars = editor.getCharacters().map((character) => ({ value: character.id, title: `${character.name} (${character.id})` }))}
                {@const itemLabels = labelsInfo.map((label) => ({ value: label.name, title: label.title || label.name }))}
                <div class="form-group">
                    <div class="info">
                        <p>Set a <b>priority</b> when configuring matching rules. It is also a good idea to create a fallback dialogue without matching rules.</p>
                    </div>
                    <InputCard items={itemChars} id="match-targets" label="Available only for these characters:" bind:selectedItems={matchData.targetCharacterIds} />
                    <h2>Label rules</h2>
                    <div class="info">
                        <p>Define which labels the target and speaking character must have for this dialogue tree to be available.</p>
                    </div>
                    <div class="in-label">
                        <InputSelect id="match-in" label="Apply labels to:" items={[{ title: 'Target', value: 'target' }, { title: 'Self', value: 'self' }]} bind:selected={matchData._in} />
                        <InputSelect id="match-label" label="Filter type:" items={[{ title: 'Any', value: 'Any' }, { title: 'All', value: 'All' }, { title: 'None', value: 'None' }]} bind:selected={matchData._label} />
                    </div>
                    {#if selectedLabelKey}
                        {#key selectedLabelKey}
                            <InputCard
                                items={itemLabels}
                                id={`match-${selectedLabelKey}`}
                                label="Select labels:"
                                selectedItems={matchData[selectedLabelKey] ?? []}
                                onChange={(label, isChecked) => updateMatchLabels(selectedLabelKey, label, isChecked)}
                            />
                        {/key}
                    {/if}
                </div>
            {/if}
            {#if choicePage.isPageEnabled}
                <InputText id="choice-id" label="Id:" bind:value={choiceData.id} autocomplete='off' wrapDiv />
                <InputTextArea id="choice-text" label="Text:" bind:value={choiceData.text} wrapDiv required />
                <InputText id="choice-next-node" label="Next node:" bind:value={choiceData.nextNodeId} autocomplete="off" wrapDiv />
                <InputSwitch id="choice-end-dialogue" label="End dialogue" bind:value={choiceData.endDialogue} wrapDiv />
                <div class="form-group">
                    <h2>Conditions</h2>
                    <ListConditions bind:values={choiceData.conditions} bind:switcher={switcher} onCancel={() => choicePage.enablePage()} onAfterSubmit={() => choicePage.enablePage()} />
                </div>
                <ButtonPopUp text={`Configure effects (${choiceData.effects?.length ?? 0})`} onclick={() => switcher.enableSwitchByName(choiceEffectsScope)} />
            {:else if switcher.data.in?.name != 'effect'}
                <div class="form-group">
                    <h2>Conditions</h2>
                    <ListConditions bind:values={matchData.conditions} bind:switcher={switcher} onCancel={() => matchPage.enablePage()} onAfterSubmit={() => matchPage.enablePage()} />
                </div>
            {/if}
            {#if switcher.data.in?.type === 'list' && switcher.data.in?.scope === choiceEffectsScope}
                <div class="form-group">
                    <h2>Choice effects</h2>
                    <ListEffects
                        bind:values={choiceData.effects}
                        page={choiceEffectsPage}
                        switcher={switcher}
                        onCancel={() => choicePage.enablePage()}
                        onAfterSubmit={() => choicePage.enablePage()}
                    />
                </div>
            {/if}
        {/if}
    </Form>
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
