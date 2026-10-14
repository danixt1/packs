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
    import { createPageSwitch, type Switch } from "$lib/shared/pageSwitch";
    import { validateActionDraft } from "$lib/shared/actionValidation";
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { showError, showSucess } from "$lib/notify";
    import type { ActionDeclaration } from "$lib/types/data/declarative";

    const editor = getCurrentWorldEditor(page.params.worldName);
    let actions = $state(editor.getActions());
    let openPopup = $state(false);
    let data = $state<Record<string, any>>({});
    let editing = $state<null | string>(null);
    let switcher = $state(createPageSwitch());

    const actionPage = switcher.createSwitch({ form: { onSubmit: submitAction, onCancel: closePopup } }, 'action');
    const displayPage = switcher.createSwitch({ form: { onSubmit: submitDisplay, onCancel: enableMainPage } }, 'display');
    const activationConditionsPage = switcher.createSwitch({ type: 'list', name: 'condition', scope: 'activation-conditions', form: {} }, 'activation-conditions');
    const targetsPage = switcher.createSwitch({ type: 'list', name: 'collector', scope: 'targets', form: {} }, 'targets');
    const activateEffectsPage = switcher.createSwitch({ type: 'list', name: 'effect', scope: 'activate-effects', form: {} }, 'activate-effects');
    const interruptEffectsPage = switcher.createSwitch({ type: 'list', name: 'effect', scope: 'interrupt-effects', form: {} }, 'interrupt-effects');
    const completeEffectsPage = switcher.createSwitch({ type: 'list', name: 'effect', scope: 'complete-effects', form: {} }, 'complete-effects');
    const selfInterruptionPage = switcher.createSwitch({ type: 'list', name: 'condition', scope: 'self-interruption', form: {} }, 'self-interruption');
    const targetInterruptionPage = switcher.createSwitch({ type: 'list', name: 'condition', scope: 'target-interruption', form: {} }, 'target-interruption');

    function emptyAction(): Record<string, any> {
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

    function enableMainPage() {
        actionPage.enablePage();
    }

    function startCreate() {
        editing = null;
        data = emptyAction();
        openPopup = true;
        enableMainPage();
    }

    function startEdit(action: Record<string, any>) {
        if (action.actionType && action.actionType !== 'character') return;
        editing = action.oid as string;
        data = $state.snapshot(action);
        data.attributes ??= [];
        data.availableTo ??= ['player'];
        data.categories ??= [];
        data._categoriesText = data.categories.join(', ');
        data.activationConditions ??= [];
        data.targets ??= [];
        data.onActivate ??= [];
        data.onInterrupt ??= [];
        data.onComplete ??= [];
        openPopup = true;
        enableMainPage();
    }

    function closePopup() {
        openPopup = false;
        editing = null;
        enableMainPage();
    }

    function openDisplay() {
        data.display ??= { name: '', description: '', showAs: 'optionOfObject' };
        displayPage.enablePage();
    }

    function removeDisplay() {
        delete data.display;
        enableMainPage();
    }

    function openInterruption() {
        data.interruption ??= { interruptSelfConditions: [], interruptTargetConditions: [] };
        selfInterruptionPage.enablePage();
    }

    function removeInterruption() {
        delete data.interruption;
        enableMainPage();
    }

    function submitAction() {
        const draft = $state.snapshot(data) as Record<string, any>;
        draft.categories = String(draft._categoriesText ?? '')
            .split(',')
            .map((category: string) => category.trim())
            .filter(Boolean);
        delete draft._categoriesText;
        delete draft.oid;

        const result = validateActionDraft(draft, {
            existingNames: actions.map((action) => action.name),
            editingOid: editing
        });
        if (!result.valid) {
            showError(result.reason ?? 'Invalid action');
            return;
        }
        const action = draft as ActionDeclaration;
        if (!action.categories?.length) delete action.categories;
        if (!action.attributes?.length) delete action.attributes;
        if (!action.onInterrupt?.length) delete action.onInterrupt;
        if (action.interruption && !action.interruption.interruptSelfConditions?.length && !action.interruption.interruptTargetConditions?.length) {
            delete action.interruption;
        }

        if (editing) {
            if (!editor.getObject(editing)) {
                showError('The action being edited no longer exists');
                closePopup();
                actions = editor.getActions();
                return;
            }
            editor.updateObjectWithOid(editing, action);
            showSucess('Action updated');
        } else {
            editor.addAction(action);
            showSucess('Action created');
        }
        actions = editor.getActions();
        closePopup();
    }

    function submitDisplay() {
        actionPage.enablePage();
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
        if (editing === oid) closePopup();
        showSucess('Action deleted');
    }

    function activeFormProps(): Record<string, any> {
        const active = switcher.getActiveSwitch();
        return active?.localData.form ?? {};
    }

    function isPageEnabled(pageToCheck: Switch) {
        return switcher.getActiveSwitch() === pageToCheck;
    }

    function actionAudienceLabel(availableTo?: string[]) {
        const audiences = availableTo?.length ? availableTo : ['player'];
        return audiences.map((audience) => audience === 'player' ? 'Player' : 'Autonomous').join(' + ');
    }
</script>

<EditorWrapper>
    <div>
        <h2>Actions</h2>
    </div>
    <ObjectTable
        items={actions.map((action) => ({
            Id: action.name,
            Time: action.executionTime,
            To: actionAudienceLabel(action.availableTo),
            Conditions: action.activationConditions.length + ' conditions'
        }))}
        ref={actions}
        headers={['Id', 'Time', 'To', 'Conditions']}
        onEdit={(action) => startEdit(action)}
        onDelete={(action) => deleteAction(action)}
    />
    <ButtonEditorCreate text="New Action" onClick={startCreate} />
</EditorWrapper>

<Popup open={openPopup} title="Action" onClose={closePopup}>
    <Form
        onSubmit={activeFormProps().onSubmit ?? submitAction}
        onCancel={activeFormProps().onCancel ?? closePopup}
    >
        {#if isPageEnabled(actionPage)}
            <InputText id="action-name" label="Id:" bind:value={data.name} required autocomplete="off" wrapDiv />
            <InputTextArea id="action-description" label="Description:" bind:value={data.description} wrapDiv />
            <InputNumber id="action-time" label="Execution time:" bind:value={data.executionTime} required min={0} wrapDiv />
            <InputSelect id="action-build-mode" label="Execution mode:" bind:selected={data.buildMode} wrapDiv items={[
                { title: 'One action per target', value: 'oneActionPerTarget' },
                { title: 'One action for all targets', value: 'oneActionForAllTargets' },
                { title: 'One action per target type', value: 'oneActionPerTargetType' }
            ]} />
            <InputCard id="action-attributes" label="Attributes:" bind:selectedItems={data.attributes} wrapDiv items={[
                { title: 'Passive action', value: 'passiveAction' },
                { title: 'Show as locked in UI', value: 'showAsLockedInUI' },
                { title: 'Interruptible', value: 'interruptible' }
            ]} />
            <InputCard id="action-audiences" label="Available to:" bind:selectedItems={data.availableTo} wrapDiv items={[
                { title: 'Player', value: 'player' },
                { title: 'Autonomous characters', value: 'autonomous' }
            ]} />
            <InputText id="action-categories" label="Categories (comma separated):" bind:value={data._categoriesText} autocomplete="off" wrapDiv />
            <div class="form-group">
                <h3>Display</h3>
                <button type="button" class="nested-button" onclick={openDisplay}>
                    {data.display ? 'Configure display' : 'Add display'}
                </button>
                {#if data.display}
                    <button type="button" class="secondary-button" onclick={removeDisplay}>Remove display</button>
                {/if}
            </div>
            <div class="form-group">
                <h3>Activation conditions</h3>
                <ListConditions bind:values={data.activationConditions} switcher={switcher} page={activationConditionsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
            </div>
            <div class="form-group">
                <h3>Targets</h3>
                <ListCollectors bind:values={data.targets} switcher={switcher} page={targetsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
            </div>
            <div class="form-group">
                <h3>Effects on activate</h3>
                <ListEffects bind:values={data.onActivate} switcher={switcher} page={activateEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
            </div>
            <div class="form-group">
                <h3>Effects on complete</h3>
                <ListEffects bind:values={data.onComplete} switcher={switcher} page={completeEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
            </div>
            <div class="form-group">
                <h3>Interruption</h3>
                <button type="button" class="nested-button" onclick={openInterruption}>
                    {data.interruption ? 'Configure interruption conditions' : 'Add interruption conditions'}
                </button>
                {#if data.interruption}
                    <button type="button" class="secondary-button" onclick={removeInterruption}>Remove interruption rules</button>
                {/if}
            </div>
            <div class="form-group">
                <h3>Effects on interrupt</h3>
                <ListEffects bind:values={data.onInterrupt} switcher={switcher} page={interruptEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
            </div>
        {:else if isPageEnabled(displayPage)}
            <InputText id="display-name" label="Display name:" bind:value={data.display.name} required autocomplete="off" wrapDiv />
            <InputTextArea id="display-description" label="Display description:" bind:value={data.display.description} required wrapDiv />
            <InputSelect id="display-show-as" label="Show as:" bind:selected={data.display.showAs} wrapDiv items={[
                { title: 'Option of object', value: 'optionOfObject' },
                { title: 'Option of action list', value: 'optionOfActionList' }
            ]} />
            <InputText id="display-locked-text" label="Locked text:" bind:value={data.display.actionLockedText} autocomplete="off" wrapDiv />
            <InputText id="display-icon" label="Icon:" bind:value={data.display.icon} autocomplete="off" wrapDiv />
        {:else if isPageEnabled(activationConditionsPage)}
            <ListConditions bind:values={data.activationConditions} switcher={switcher} page={activationConditionsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
        {:else if isPageEnabled(targetsPage)}
            <ListCollectors bind:values={data.targets} switcher={switcher} page={targetsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
        {:else if isPageEnabled(activateEffectsPage)}
            <ListEffects bind:values={data.onActivate} switcher={switcher} page={activateEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
        {:else if isPageEnabled(interruptEffectsPage)}
            <ListEffects bind:values={data.onInterrupt} switcher={switcher} page={interruptEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
        {:else if isPageEnabled(completeEffectsPage)}
            <ListEffects bind:values={data.onComplete} switcher={switcher} page={completeEffectsPage} onCancel={enableMainPage} onAfterSubmit={enableMainPage} />
        {:else if isPageEnabled(selfInterruptionPage)}
            <h3>Self interruption conditions</h3>
            <ListConditions bind:values={data.interruption.interruptSelfConditions} switcher={switcher} page={selfInterruptionPage} onCancel={openInterruption} onAfterSubmit={openInterruption} />
        {:else if isPageEnabled(targetInterruptionPage)}
            <h3>Target interruption conditions</h3>
            <ListConditions bind:values={data.interruption.interruptTargetConditions} switcher={switcher} page={targetInterruptionPage} onCancel={openInterruption} onAfterSubmit={openInterruption} />
        {/if}
    </Form>
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
</style>
