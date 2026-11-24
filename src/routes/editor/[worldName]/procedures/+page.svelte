<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import ButtonEditorCreate from '$lib/components/editor/ButtonEditorCreate.svelte';
    import EditorWrapper from '$lib/components/EditorWrapper.svelte';
    import Form from '$lib/components/Form.svelte';
    import { InputSelect, InputText } from '$lib/components/inputs';
    import ObjectTable from '$lib/components/ObjectTable.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import ListEffects from '$lib/components/lists/ListEffects.svelte';
    import ContextHost from '$lib/components/ContextHost.svelte';
    import { createContextStack, type ContextFrame } from '$lib/shared/contextStack.svelte';
    import { getCurrentWorldEditor } from '$lib/shared/worldEditor';
    import { listenForWorldEditorContextsChanged } from '$lib/shared/worldEditorContextEvents';
    import { showError, showSucess } from '$lib/notify';
    import type { ProcedureDeclaration } from '$lib/types/data/declarative';
    import type { CtxBuilder } from '$lib/shared/getterCtx';

    const editor = getCurrentWorldEditor(page.params.worldName);
    let procedures = $state(editor.getProcedures());
    const stack = createContextStack();

    onMount(() => listenForWorldEditorContextsChanged(page.params.worldName ?? '', () => {
        procedures = editor.getProcedures();
    }));

    function procedureContext(parameters: ProcedureDeclaration['parameters'] = []): CtxBuilder {
        return {
            editor,
            allowedGetters: ['self', 'target', 'runtime', 'temp', 'world', 'parameter'],
            allowedObjects: ['action', 'character', 'character/place', 'item', 'place'],
            selfMetadata: 'character',
            parameterVars: parameters.map(parameter => parameter.name).filter(Boolean)
        };
    }

    async function startCreate() {
        const result = await stack.push<ProcedureDeclaration, ProcedureDeclaration>({
            title: 'Create Procedure',
            data: { name: '', parameters: [], effects: [] },
            render: renderProcedureForm,
            meta: { mode: 'create' }
        });
        if (result) saveProcedure(result);
    }

    async function startEdit(procedure: ProcedureDeclaration & { oid: string }) {
        const result = await stack.push<ProcedureDeclaration & { oid: string }, ProcedureDeclaration>({
            title: `Edit Procedure: ${procedure.name}`,
            data: $state.snapshot(procedure),
            render: renderProcedureForm,
            meta: { mode: 'edit', editingOid: procedure.oid }
        });
        if (result) saveProcedure(result, procedure.oid);
    }

    function saveProcedure(input: ProcedureDeclaration, editingOid?: string) {
        const procedure = $state.snapshot(input);
        procedure.name = procedure.name.trim();
        procedure.parameters = procedure.parameters.map(parameter => ({ ...parameter, name: parameter.name.trim() }));
        if (!procedure.name) {
            showError('Add a procedure name');
            return;
        }
        if (procedures.some(existing => existing.name === procedure.name && existing.oid !== editingOid)) {
            showError(`Procedure "${procedure.name}" already exists`);
            return;
        }
        const parameterNames = procedure.parameters.map(parameter => parameter.name);
        if (parameterNames.some(name => !/^[a-zA-Z0-9]+$/.test(name)) || new Set(parameterNames).size !== parameterNames.length) {
            showError('Procedure parameters need unique names using only letters and numbers');
            return;
        }
        if (editingOid) {
            editor.updateObjectWithOid(editingOid, procedure);
            showSucess('Procedure updated');
        } else {
            editor.addProcedure(procedure);
            showSucess('Procedure created');
        }
        procedures = editor.getProcedures();
    }

    function deleteProcedure(procedure: Record<string, unknown>) {
        const oid = procedure.oid;
        if (typeof oid !== 'string' || !oid.startsWith('procedure:')) return;
        editor.deleteObject(oid);
        procedures = editor.getProcedures();
        showSucess('Procedure deleted');
    }

    function submit(frame: ContextFrame<any, any>) {
        const draft:{name:string,effects:any[],parameters:{name:string,type:string}[]} = $state.snapshot(frame.draft);
        draft.name = draft.name.trim();
        if (!draft.name) {
            showError('Add a procedure name');
            return;
        }
        if (!draft.effects.length) {
            showError('Add at least one procedure effect');
            return;
        }
        const names = draft.parameters.map(parameter => parameter.name.trim());
        if (names.some(name => !/^[a-zA-Z0-9]+$/.test(name)) || new Set(names).size !== names.length) {
            showError('Procedure parameters need unique names using only letters and numbers');
            return;
        }
        if (procedures.some(existing => existing.name === draft.name && existing.oid !== frame.meta?.editingOid)) {
            showError(`Procedure "${draft.name}" already exists`);
            return;
        }
        frame.resolve(draft);
    }
</script>

{#snippet renderProcedureForm(frame: ContextFrame<any, any>)}
    <Form onSubmit={() => submit(frame)} onCancel={() => frame.cancel()}>
        <div class="form-group">
            <InputText id="procedure-name" label="Name:" bind:value={frame.draft.name} />
            <section class="parameter-list" aria-label="Procedure parameters">
                <h3>Parameters</h3>
                {#each frame.draft.parameters as parameter, index (index)}
                    <div class="parameter-row">
                        <div class="parameter-name">
                            <InputText id={`procedure-parameter-name-${index}`} label="Name:" bind:value={parameter.name} />
                        </div>
                        <InputSelect id={`procedure-parameter-type-${index}`} label="Type:" bind:selected={parameter.type} items={[
                            { title: 'Number', value: 'number' },
                            { title: 'Text', value: 'string' },
                            { title: 'Boolean', value: 'boolean' }
                        ]} />
                        <button type="button" class="nested-button" onclick={() => frame.draft.parameters.splice(index, 1)}>Remove</button>
                    </div>
                {/each}
                <button type="button" class="nested-button" onclick={() => frame.draft.parameters.push({ name: '', type: 'number' })}>Add parameter</button>
            </section>
            <section class="effect-section" aria-label="Procedure effects">
                <h3>Effects</h3>
                <ListEffects bind:values={frame.draft.effects} {stack} ctx={procedureContext(frame.draft.parameters)} />
            </section>
        </div>
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Procedures</h2>
        <p>Reusable effect sequences that actions and other procedures can call.</p>
    </div>
    <ObjectTable
        items={procedures.map(procedure => ({
            Name: procedure.name,
            Parameters: procedure.parameters.map(parameter => `${parameter.name}: ${parameter.type}`).join(', ') || 'None',
            Effects: procedure.effects.length
        }))}
        ref={procedures}
        headers={['Name', 'Parameters', 'Effects']}
        onEdit={procedure => startEdit(procedure as any)}
        onDelete={deleteProcedure}
    />
    <ButtonEditorCreate text="New Procedure" onClick={startCreate} />
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Procedure'} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>

<style>
    .parameter-list,
    .effect-section {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin: 1rem 0;
        padding: 1rem;
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-card);
    }

    h3 {
        margin: 0;
        color: var(--color-text-bright);
        font-size: 1rem;
    }

    .parameter-row {
        display: grid;
        grid-template-columns: minmax(10rem, 1fr) minmax(8rem, 0.8fr) auto;
        gap: 0.75rem;
        align-items: end;
    }

    .parameter-name {
        min-width: 0;
    }

    .parameter-name :global(.input-label) {
        margin-bottom: 0.3rem;
    }

    .nested-button {
        min-height: 2.5rem;
        padding: 0.5rem 0.75rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }

    .nested-button:hover {
        border-color: var(--border-strong);
        background: var(--bg-card-hover);
    }

    @media (max-width: 600px) {
        .parameter-row {
            grid-template-columns: 1fr;
            padding: 0.75rem;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            background: var(--bg-panel-solid);
        }
    }
</style>
