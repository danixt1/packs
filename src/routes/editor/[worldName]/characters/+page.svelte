<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { showError, showSucess } from "$lib/notify";
    import type { Character } from "$lib/types/data/declarative";

    //Components
    import { InputText, InputCard } from "$lib/components/inputs";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import Form from "$lib/components/Form.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import ListVars from "$lib/components/lists/ListVars.svelte";
    import InputSwitch from "$lib/components/inputs/InputSwitch.svelte";
    import FormAutonomy from "$lib/components/forms/FormAutonomy.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import { createContextStack } from "$lib/shared/contextStack.svelte";

    let editor = getCurrentWorldEditor(page.params.worldName);
    let labelsInfo = $state(editor.getLabels());
    let characters = $state(editor.getCharacters());
    let knowVars = $derived(Array.from(new Set(characters.map(e =>e.vars.map(a =>a.name)).flat())))
    const stack = createContextStack();

    let charsList = $derived(characters.map((character) => ({
            Id: character.id,
            Name: character.name,
            Labels: character.labels?.join(', ') ?? '',
            Variables: character.vars.map((v) => `${v.name}`).join(', '),
            Autonomy: character.autonomy
                ? `${character.autonomy.enabled === false ? 'Disabled' : 'Enabled'} (${character.autonomy.rules?.length ?? 0} rules)`
                : 'None'
    })));

    async function startCreate() {
        const newChar = await stack.push<Partial<Character>, Character>({
            title: 'New Character',
            data: { id: '', name: '', labels: [], controlledByPlayer: false, vars: [] },
            render: renderCharacterForm,
            meta: { mode: 'create' }
        });

        if (newChar) {
            const cleanId = String(newChar.id ?? '').trim();
            if (editor.getObject('char:' + cleanId)) {
                showError('Character already exists');
                return;
            }
            editor.addCharacter({
                id: cleanId,
                name: newChar.name,
                labels: newChar.labels || [],
                controlledByPlayer: newChar.controlledByPlayer ?? false,
                vars: newChar.vars || [],
                autonomy: newChar.autonomy
            });
            characters = editor.getCharacters();
            showSucess('Character created');
        }
    }

    async function startEdit(item: Record<string, any>) {
        const originalOid = item.oid as string;
        const target = $state.snapshot(item) as Character & { _baseOID?: string };
        target._baseOID = originalOid;

        const updated = await stack.push<Character & { _baseOID?: string }, Character & { _baseOID?: string }>({
            title: `Edit ${target.name || target.id}`,
            data: target,
            render: renderCharacterForm,
            meta: { mode: 'edit', originalId: target.id }
        });

        if (updated) {
            const baseOid = updated._baseOID ?? originalOid;
            delete updated._baseOID;
            editor.updateObjectWithOid(baseOid, updated);
            characters = editor.getCharacters();
            showSucess('Character updated');
        }
    }

    async function openCreateLabel() {
        const created = await stack.push<{ name: string; title: string; description: string }, { name: string; title: string; description: string }>({
            title: 'Create Label',
            data: { name: '', title: '', description: '' },
            render: renderLabelForm
        });

        if (created) {
            const cleanName = String(created.name ?? '').trim();
            if (!cleanName) {
                showError('Label name is required');
                return;
            }
            if (editor.getObject('label:' + cleanName)) {
                showError('Label ' + cleanName + ' already exists');
                return;
            }
            editor.addLabel(cleanName, { description: created.description, title: created.title });
            labelsInfo = editor.getLabels();
            showSucess('Label created');
        }
    }

    async function openAutonomy(frame: any) {
        const updated = await stack.push<any, any>({
            title: 'Configure Autonomy',
            data: frame.draft.autonomy ?? { enabled: true, rules: [] },
            render: renderAutonomyForm
        });

        if (updated) {
            frame.draft.autonomy = updated;
        }
    }

    function submitCharacterForm() {
        const frame = stack.current;
        if (!frame) return;

        const draft = frame.draft;
        const cleanId = String(draft.id ?? '').trim();
        if (!cleanId) {
            showError('Character ID is required');
            return;
        }

        const isCreate = frame.meta?.mode === 'create';
        const targetOid = isCreate ? 'char:' + cleanId : (draft._baseOID ?? 'char:' + cleanId);

        if (isCreate && editor.getObject('char:' + cleanId)) {
            showError('Character already exists');
            return;
        }
        if (!isCreate && targetOid !== 'char:' + cleanId && editor.getObject('char:' + cleanId)) {
            showError('Character already exists');
            return;
        }

        frame.resolve({
            ...draft,
            id: cleanId,
            labels: draft.labels || [],
            controlledByPlayer: draft.controlledByPlayer ?? false,
            vars: draft.vars || []
        });
    }

    function cancelCharacterForm() {
        stack.current?.cancel();
    }
</script>

{#snippet renderCharacterForm(frame: any)}
    <Form onSubmit={submitCharacterForm} onCancel={cancelCharacterForm}>
        <InputText id="charId" label="ID" bind:value={frame.draft.id} wrapDiv required autocomplete="off"/>
        <InputText id="charName" label="Name" bind:value={frame.draft.name} wrapDiv required autocomplete="off" />
        <InputSwitch id='controlledByPlayer' label="Controlled by player?" wrapDiv bind:value={frame.draft.controlledByPlayer} />
        <InputCard id="charLabels" label="Labels" items={labelsInfo.map((label) => ({
            value: label.name,
            title: label.title ?? label.name
        }))} bind:selectedItems={frame.draft.labels} wrapDiv />
        <BaseInput id='create-label' wrapDiv>
            <button type="button" onclick={openCreateLabel}>Create Label</button>
        </BaseInput>
        <BaseInput id='edit-autonomy' wrapDiv>
            <button type="button" onclick={() => openAutonomy(frame)}>
                {frame.draft.autonomy ? 'Configure Autonomy' : 'Add Autonomy'}
            </button>
            {#if frame.draft.autonomy}
                <button type="button" onclick={() => { delete frame.draft.autonomy; }}>Remove Autonomy</button>
            {/if}
        </BaseInput>
        <ListVars {stack} bind:values={frame.draft.vars} suggestions={knowVars}/>
    </Form>
{/snippet}

{#snippet renderLabelForm(frame: any)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <InputText id="labelName" label="Name(id)" bind:value={frame.draft.name} wrapDiv required autocomplete="off"/>
        <InputText id="labelTitle" label="Title" bind:value={frame.draft.title} wrapDiv autocomplete="off"/>
        <InputText id="labelDesc" label="Description" bind:value={frame.draft.description} wrapDiv autocomplete="off"/>
    </Form>
{/snippet}

{#snippet renderAutonomyForm(frame: any)}
    <FormAutonomy
        bind:value={frame.draft}
        {stack}
        actions={editor.getActions()}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(autonomy) => frame.resolve(autonomy)}
    />
{/snippet}

<EditorWrapper>
    <div>
        <h2>Characters</h2>
    </div>
    <ObjectTable
        bind:items={charsList}
        headers={['Id','Name', 'Labels', 'Variables', 'Autonomy']}
        ref={characters}
        onEdit={(character) => startEdit(character)}
        onDelete={(character) => {
            editor.deleteObject(character.oid as string);
            characters = editor.getCharacters();
        }}
    />
    <ButtonEditorCreate text="Add Character" onClick={startCreate}/>
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Character'} onClose={() => stack.reset()}> 
    <ContextHost {stack} />
</Popup>

<style>
    button {
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>