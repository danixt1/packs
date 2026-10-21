<script lang="ts">
    import { page } from "$app/state";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import Form from "$lib/components/Form.svelte";
    import { InputCard, InputNumber, InputSelect, InputText, InputTextArea } from "$lib/components/inputs";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import Popup from "$lib/components/Popup.svelte";
    import ListCollectors from "$lib/components/lists/ListCollectors.svelte";
    import ListConditions from "$lib/components/lists/ListConditions.svelte";
    import ListEffects from "$lib/components/lists/ListEffects.svelte";
    import ContextHost from "$lib/components/ContextHost.svelte";
    import { createContextStack,type ContextFrame } from "$lib/shared/contextStack.svelte";
    import { validateActionDraft } from "$lib/shared/actionValidation";
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { showError, showSucess } from "$lib/notify";
    import type { ActionDeclaration, CollectorToGet } from "$lib/types/data/declarative";
    import type { GettersType } from "$lib/types/data/getters";
    import type { allowedObjects, CtxBuilder } from "$lib/shared/getterCtx";

    const editor = getCurrentWorldEditor(page.params.worldName);
    let actions = $state(editor.getActions());
    const stack = createContextStack();

    let baseCtx:CtxBuilder ={allowedGetters:['runtime','self','target','temp','world'] as GettersType[],editor:editor,allowedObjects:['action','character','character/place','item','place'],actionCategories:editor.getCategories()}
    function setAvaliableObjectsForCtx(collectors:CollectorToGet[],ctx?:CtxBuilder){
        
        if(!ctx)return;
        let allowed:Set<allowedObjects> = new Set(['action']);
        for(const collector of collectors){
            if(collector.target === 'character'){
                allowed.add('character').add('character/place');
                continue;
            }
            if(collector.target === 'connectedPlaces' || collector.target === 'place'){
                allowed.add('place');
                continue;
            }
            if(collector.target === 'item'){
                allowed.add('item');
            }
        }
        ctx.allowedObjects = Array.from(allowed);
    }
    function emptyAction(): ActionDeclaration  & {_categoriesText:string} {
        return {
            name: '',
            description: '',
            executionTime: 0,
            buildMode: 'oneActionPerTarget',
            attributes: [],
            availableTo: ['player'],
            categories: [],
            _categoriesText: '',
            activationConditions: [],
            targets: [],
            onActivate: [],
            onInterrupt: [],
            onComplete: []
        };
    }

    async function startCreate() {
        const result = await stack.push<any, any>({
            title: 'New Action',
            data: emptyAction(),
            render: renderActionForm,
            meta: { mode: 'create',ctx:{...baseCtx} }
        });

        if (result) {
            handleSaveAction(result, null);
        }
    }

    async function startEdit(action: Record<string, any>) {
        if (action.actionType && action.actionType !== 'character') return;
        const editingOid = action.oid as string;
        const initial = $state.snapshot(action);
        initial.attributes ??= [];
        initial.availableTo ??= ['player'];
        initial.categories ??= [];
        initial._categoriesText = initial.categories.join(', ');
        initial.activationConditions ??= [];
        initial.targets ??= [];
        initial.onActivate ??= [];
        initial.onInterrupt ??= [];
        initial.onComplete ??= [];

        const result = await stack.push<any, any>({
            title: `Edit ${initial.name}`,
            data: initial,
            render: renderActionForm,
            meta: { mode: 'edit', editingOid,ctx:{...baseCtx} }
        });

        if (result) {
            handleSaveAction(result, editingOid);
        }
    }
    function onSubmit(frame:ContextFrame){
        const editingOid = frame.meta?.editingOid;
        const draft = $state.snapshot(frame.draft);
        draft.categories = String(draft._categoriesText ?? '')
            .split(',')
            .map((category: string) => category.trim())
            .filter(Boolean);
        const result = validateActionDraft(draft, {
            existingNames: actions.map((action) => action.name),
            editingOid
        });
        if(!result.valid){
            showError(result.reason ?? 'Invalid action');
            return
        }
        frame.resolve(frame.draft);
    }
    function handleSaveAction(data: Record<string, any>, editingOid: string | null) {
        const draft = $state.snapshot(data) as Record<string, any>;
        draft.categories = String(draft._categoriesText ?? '')
            .split(',')
            .map((category: string) => category.trim())
            .filter(Boolean);
        const result = validateActionDraft(draft, {
            existingNames: actions.map((action) => action.name),
            editingOid
        });
        if (!result.valid) {
            showError(result.reason ?? 'Invalid action');
            return;
        }
        delete draft._categoriesText;
        delete draft.oid;

        const action = draft as ActionDeclaration;
        if (!action.categories?.length) delete action.categories;
        if (!action.attributes?.length) delete action.attributes;
        if (!action.onInterrupt?.length) delete action.onInterrupt;
        if (action.interruption && !action.interruption.interruptSelfConditions?.length && !action.interruption.interruptTargetConditions?.length) {
            delete action.interruption;
        }

        if (editingOid) {
            if (!editor.getObject(editingOid)) {
                showError('The action being edited no longer exists');
                actions = editor.getActions();
                return;
            }
            editor.updateObjectWithOid(editingOid, action);
            showSucess('Action updated');
        } else {
            editor.addAction(action);
            showSucess('Action created');
        }
        actions = editor.getActions();
    }

    function deleteAction(action: Record<string, unknown>) {
        const oid = action.oid;
        if (typeof oid !== 'string' || !oid.startsWith('action:')) {
            showError('Unable to delete action: invalid action id');
            return;
        }
        const current = editor.getObject(oid);
        if (!current) {
            showError('Unable to delete action: action no longer exists');
            actions = editor.getActions();
            return;
        }
        editor.deleteObject(oid);
        actions = editor.getActions();
        showSucess('Action deleted');
    }

    async function openDisplay(parentFrame: any) {
        parentFrame.draft.display ??= { name: '', description: '', showAs: 'optionOfObject' };
        const updated = await stack.push<any, any>({
            title: 'Configure Display',
            data: $state.snapshot(parentFrame.draft.display),
            render: renderDisplayForm
        });
        if (updated) {
            parentFrame.draft.display = updated;
        }
    }

    function removeDisplay(parentFrame: any) {
        delete parentFrame.draft.display;
    }

    async function openInterruption(parentFrame: any) {
        parentFrame.draft.interruption ??= { interruptSelfConditions: [], interruptTargetConditions: [] };
        const updated = await stack.push<any, any>({
            title: 'Interruption Rules',
            data: $state.snapshot(parentFrame.draft.interruption),
            render: renderInterruptionForm
        });
        if (updated) {
            parentFrame.draft.interruption = updated;
        }
    }

    function removeInterruption(parentFrame: any) {
        delete parentFrame.draft.interruption;
    }

    function actionAudienceLabel(availableTo?: string[]) {
        const audiences = availableTo?.length ? availableTo : ['player'];
        return audiences.map((audience) => audience === 'player' ? 'Player' : 'Autonomous').join(' + ');
    }
</script>

{#snippet renderActionForm(frame: ContextFrame)}
    <Form onSubmit={() => onSubmit(frame)} onCancel={() => frame.cancel()}>
        <InputText id="action-name" label="Id:" bind:value={frame.draft.name} required autocomplete="off" wrapDiv />
        <InputTextArea id="action-description" label="Description:" bind:value={frame.draft.description} wrapDiv />
        <div class="form-group b-line">
            <h3>Collect Targets:</h3>
            <ListCollectors {stack} bind:values={frame.draft.targets} onAfterSubmit={()=>{setAvaliableObjectsForCtx(frame.draft.targets,frame.meta?.ctx)}} />
        </div>
        {#if frame.draft.targets && frame.draft.targets.length > 0}
        <InputNumber id="action-time" label="Execution time:" bind:value={frame.draft.executionTime} required min={0} wrapDiv />
        <InputSelect id="action-build-mode" label="Execution mode:" bind:selected={frame.draft.buildMode} wrapDiv items={[
            { title: 'One action per target', value: 'oneActionPerTarget' },
            { title: 'One action for all targets', value: 'oneActionForAllTargets' },
            { title: 'One action per target type', value: 'oneActionPerTargetType' }
        ]} />
        <InputCard id="action-attributes" label="Attributes:" bind:selectedItems={frame.draft.attributes} wrapDiv items={[
            { title: 'Passive action', value: 'passiveAction' },
            { title: 'Show as locked in UI', value: 'showAsLockedInUI' },
            { title: 'Interruptible', value: 'interruptible' }
        ]} />
        <InputCard id="action-audiences" label="Available to:" bind:selectedItems={frame.draft.availableTo} wrapDiv items={[
            { title: 'Player', value: 'player' },
            { title: 'Autonomous characters', value: 'autonomous' }
        ]} />
        <InputText id="action-categories" label="Categories (comma separated):" bind:value={frame.draft._categoriesText} autocomplete="off" wrapDiv />
        <div class="form-group">
            <h3>Display</h3>
            {#if frame.draft.availableTo.includes('player') && !frame.draft.display}
            <p class="warn">Display not setted!. Player <b>can't</b> use this action without display.</p>
            {/if}
            <button type="button" class="nested-button" onclick={() => openDisplay(frame)}>
                {frame.draft.display ? 'Configure display' : 'Add display'}
            </button>
            {#if frame.draft.display}
                <button type="button" class="secondary-button" onclick={() => removeDisplay(frame)}>Remove display</button>
            {/if}
        </div>
        <div class="form-group">
            <h3>Activation conditions</h3>
            <ListConditions {stack} bind:values={frame.draft.activationConditions} ctx={baseCtx}/>
        </div>
        <div class="form-group">
            <h3>Effects on activate</h3>
            <ListEffects {stack} bind:values={frame.draft.onActivate} ctx={frame.meta?.ctx}/>
        </div>
        <div class="form-group">
            <h3>Effects on complete</h3>
            <ListEffects {stack} bind:values={frame.draft.onComplete} ctx={frame.meta?.ctx}/>
        </div>
        <div class="form-group">
            <h3>Interruption</h3>
            <button type="button" class="nested-button" onclick={() => openInterruption(frame)}>
                {frame.draft.interruption ? 'Configure interruption conditions' : 'Add interruption conditions'}
            </button>
            {#if frame.draft.interruption}
                <button type="button" class="secondary-button" onclick={() => removeInterruption(frame)}>Remove interruption rules</button>
            {/if}
        </div>
        <div class="form-group">
            <h3>Effects on interrupt</h3>
            <ListEffects {stack} bind:values={frame.draft.onInterrupt} ctx={frame.meta?.ctx}/>
        </div>
        {/if}
    </Form>
{/snippet}

{#snippet renderDisplayForm(frame: ContextFrame)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <InputText id="display-name" label="Display name:" bind:value={frame.draft.name} required autocomplete="off" wrapDiv />
        <InputTextArea id="display-description" label="Display description:" bind:value={frame.draft.description} required wrapDiv />
        <InputSelect id="display-show-as" label="Show as:" bind:selected={frame.draft.showAs} wrapDiv items={[
            { title: 'Option of object', value: 'optionOfObject' },
            { title: 'Option of action list', value: 'optionOfActionList' }
        ]} />
        <InputText id="display-locked-text" label="Locked text:" bind:value={frame.draft.actionLockedText} autocomplete="off" wrapDiv />
        <InputText id="display-icon" label="Icon:" bind:value={frame.draft.icon} autocomplete="off" wrapDiv />
    </Form>
{/snippet}

{#snippet renderInterruptionForm(frame: any)}
    <Form onSubmit={() => frame.resolve(frame.draft)} onCancel={() => frame.cancel()}>
        <div class="form-group">
            <h3>Self interruption conditions</h3>
            <ListConditions {stack} bind:values={frame.draft.interruptSelfConditions} ctx={baseCtx}/>
        </div>
        <div class="form-group">
            <h3>Target interruption conditions</h3>
            <ListConditions {stack} bind:values={frame.draft.interruptTargetConditions} ctx={baseCtx}/>
        </div>
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Actions</h2>
    </div>
    <ObjectTable
        items={actions.map((action) => ({
            Id: action.name,
            Time: action.executionTime,
            'Avaliable To:': actionAudienceLabel(action.availableTo),
            Effects: `${action.onComplete.length} on Complete, ${action.onActivate.length} on Activation`
        }))}
        ref={actions}
        headers={['Id', 'Time', 'Avaliable To:', 'Effects']}
        onEdit={(action) => startEdit(action)}
        onDelete={(action) => deleteAction(action)}
    />
    <ButtonEditorCreate text="New Action" onClick={startCreate} />
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Action'} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>

<style>
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .form-group h3 {
        margin: 0;
        font-size: 1rem;
    }
    .nested-button,
    .secondary-button {
        width: 100%;
        padding: 0.5rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }
    .nested-button:hover,
    .secondary-button:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
    .secondary-button {
        opacity: 0.8;
    }
    .b-line{
        border-bottom: 1px solid var(--border-default);
    }
    .warn{
        color: var(--color-accent);
        border-left: 3px solid var(--border-strong);
        padding-left: 3px;
        font-size: 14px;
    }
</style>
