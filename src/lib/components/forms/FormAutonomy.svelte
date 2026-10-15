<script lang="ts">
    import { showError } from "$lib/notify";
    import { createPageSwitch, type Switch } from "$lib/shared/pageSwitch";
    import FormVar from "./FormVar.svelte";
    import ListConditions from "../lists/ListConditions.svelte";
    import OrderedList from "../lists/OrderedList.svelte";
    import {InputNumber,InputSelect,InputSwitch,InputText,InputTextArea} from "$lib/components/inputs"

    interface ActionInfo {
        name: string;
    }

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data: Record<string, any>) => void;
        value?: Record<string, any> | null;
        writeFormPropsTo?: Record<string, any>;
        actions?: ActionInfo[];
    }

    let {
        onCancel,
        onAfterSubmit,
        value,
        writeFormPropsTo = $bindable(),
        actions = []
    }: Props = $props();

    function emptyAutonomy(): Record<string, any> {
        return {
            mode: 'rule-based',
            enabled: true,
            decisionInterval: 1,
            maxActionsPerCycle: 1,
            memory: [],
            goals: [],
            rules: []
        };
    }

    function emptyGoal(): Record<string, any> {
        return {
            name: '',
            description: '',
            priority: 0,
            when: [],
            stayActiveIf: []
        };
    }

    function emptyRule(): Record<string, any> {
        return {
            type: 'action-rule',
            name: '',
            description: '',
            priority: 0,
            when: [],
            actionName: '',
            weight: undefined,
            goal: '',
            cooldown: undefined,
            targeting: 'firstValid',
            duration: undefined
        };
    }

    let draft = $state<Record<string, any>>(emptyAutonomy());
    let nestedSwitcher = $state(createPageSwitch());
    let memoryEditing = $state<number | null>(null);
    let memoryFormData = $state<Record<string, any>>({});
    let goalEditing = $state<number | null>(null);
    let goalData = $state<Record<string, any>>(emptyGoal());
    let ruleEditing = $state<number | null>(null);
    let ruleData = $state<Record<string, any>>(emptyRule());
    let initialValue = $state(true);

    function submitAutonomy() {
        const result = $state.snapshot(draft) as Record<string, any>;
        result.mode = 'rule-based';
        result.memory ??= [];
        result.goals ??= [];
        result.rules ??= [];
        onAfterSubmit?.(result);
    }

    function submitActive() {
        const active = nestedSwitcher.getActiveSwitch();
        (active?.localData.form?.onSubmit ?? submitAutonomy)();
    }

    function cancelActive() {
        const active = nestedSwitcher.getActiveSwitch();
        (active?.localData.form?.onCancel ?? onCancel)?.();
    }

    function enable(page: Switch, form: Record<string, any> = {}) {
        page.localData.form = form;
        page.enablePage();
    }

    function showMain() {
        enable(mainPage, { onSubmit: submitAutonomy, onCancel });
    }

    function showMemory() {
        enable(memoryPage, { onSubmit: showMain, onCancel: showMain });
    }

    function openMemoryVariable(index?: number) {
        memoryEditing = typeof index === 'number' ? index : null;
        memoryFormData = typeof index === 'number'
            ? $state.snapshot(draft.memory[index])
            : {};
        enable(memoryFormPage);
    }

    function saveMemoryVariable(variable: Record<string, any>) {
        const next = [...(draft.memory ?? [])];
        if (memoryEditing === null) next.push(variable);
        else next[memoryEditing] = variable;
        draft.memory = next;
        memoryEditing = null;
        showMemory();
    }

    function describeVariable(variable: Record<string, any>) {
        const value = variable.type === 'string' ? `"${variable.value}"` : String(variable.value);
        return `${variable.name} (${variable.type}): ${value}`;
    }

    function showGoals() {
        enable(goalsPage, { onSubmit: showMain, onCancel: showMain });
    }

    function openGoal(index?: number) {
        goalEditing = typeof index === 'number' ? index : null;
        const incoming = typeof index === 'number' ? draft.goals[index] : emptyGoal();
        goalData = {
            ...emptyGoal(),
            ...$state.snapshot(incoming ?? {}),
            when: [...(incoming?.when ?? [])],
            stayActiveIf: [...(incoming?.stayActiveIf ?? [])]
        };
        showGoalForm();
    }

    function showGoalForm() {
        enable(goalFormPage, { onSubmit: saveGoal, onCancel: showGoals });
    }

    function saveGoal() {
        const name = String(goalData.name ?? '').trim();
        if (!name) {
            showError('Goal name is required');
            return;
        }
        const duplicate = (draft.goals ?? []).some((goal: Record<string, any>, index: number) =>
            goal.name === name && index !== goalEditing
        );
        if (duplicate) {
            showError('A goal with this name already exists');
            return;
        }

        const goal = $state.snapshot(goalData) as Record<string, any>;
        goal.name = name;
        goal.when ??= [];
        goal.stayActiveIf ??= [];
        if (!goal.description) delete goal.description;

        const next = [...(draft.goals ?? [])];
        if (goalEditing === null) next.push(goal);
        else next[goalEditing] = goal;
        draft.goals = next;
        goalEditing = null;
        showGoals();
    }

    function describeGoal(goal: Record<string, any>) {
        return `Goal: ${goal.name || '(unnamed)'} (priority ${goal.priority ?? 0})`;
    }

    function showRules() {
        enable(rulesPage, { onSubmit: showMain, onCancel: showMain });
    }

    function openRule(index?: number) {
        ruleEditing = typeof index === 'number' ? index : null;
        const incoming = typeof index === 'number' ? draft.rules[index] : emptyRule();
        ruleData = {
            ...emptyRule(),
            ...$state.snapshot(incoming ?? {}),
            when: [...(incoming?.when ?? [])]
        };
        showRuleForm();
    }

    function showRuleForm() {
        enable(ruleFormPage, { onSubmit: saveRule, onCancel: showRules });
    }

    function saveRule() {
        const name = String(ruleData.name ?? '').trim();
        if (!name) {
            showError('Rule name is required');
            return;
        }
        const duplicate = (draft.rules ?? []).some((rule: Record<string, any>, index: number) =>
            rule.name === name && index !== ruleEditing
        );
        if (duplicate) {
            showError('A rule with this name already exists');
            return;
        }

        const rule: Record<string, any> = {
            type: ruleData.type ?? 'action-rule',
            name,
            priority: ruleData.priority ?? 0,
            when: [...(ruleData.when ?? [])]
        };
        if (ruleData.description) rule.description = ruleData.description;
        if (ruleData.goal) rule.goal = ruleData.goal;

        if (rule.type === 'action-rule') {
            if (!ruleData.actionName) {
                showError('Select an action for the rule');
                return;
            }
            rule.actionName = ruleData.actionName;
            if (typeof ruleData.weight === 'number') rule.weight = ruleData.weight;
            if (typeof ruleData.cooldown === 'number') rule.cooldown = ruleData.cooldown;
            if (ruleData.targeting) rule.targeting = ruleData.targeting;
        } else if (typeof ruleData.duration === 'number') {
            rule.duration = ruleData.duration;
        }

        const next = [...(draft.rules ?? [])];
        if (ruleEditing === null) next.push(rule);
        else next[ruleEditing] = rule;
        draft.rules = next;
        ruleEditing = null;
        showRules();
    }

    function describeRule(rule: Record<string, any>) {
        const kind = rule.type === 'idle-rule' ? 'Idle' : `Action: ${rule.actionName || '(not selected)'}`;
        return `Rule: ${rule.name || '(unnamed)'} — ${kind} (priority ${rule.priority ?? 0})`;
    }

    let goalItems = $derived([
        { title: 'No goal', value: '' },
        ...(draft.goals ?? []).map((goal: Record<string, any>) => ({ title: goal.name, value: goal.name }))
    ]);
    let actionItems = $derived([
        { title: 'Select an action', value: '' },
        ...actions.map((action) => ({ title: action.name, value: action.name }))
    ]);

    const mainPage = nestedSwitcher.createSwitch({ form: { onSubmit: submitAutonomy, onCancel: () => onCancel?.() } }, 'main');
    const memoryPage = nestedSwitcher.createSwitch({ form: { onSubmit: showMain, onCancel: showMain } }, 'memory');
    const memoryFormPage = nestedSwitcher.createSwitch({ form: {} }, 'memory-form');
    const goalsPage = nestedSwitcher.createSwitch({ form: { onSubmit: showMain, onCancel: showMain } }, 'goals');
    const goalFormPage = nestedSwitcher.createSwitch({ form: {} }, 'goal-form');
    const goalWhenPage = nestedSwitcher.createSwitch({ form: {} }, 'goal-when');
    const goalStayActivePage = nestedSwitcher.createSwitch({ form: {} }, 'goal-stay-active');
    const rulesPage = nestedSwitcher.createSwitch({ form: { onSubmit: showMain, onCancel: showMain } }, 'rules');
    const ruleFormPage = nestedSwitcher.createSwitch({ form: {} }, 'rule-form');
    const ruleWhenPage = nestedSwitcher.createSwitch({ form: {} }, 'rule-when');

    $effect(() => {
        const incoming = value;
        if (!initialValue) return;
        initialValue = false;
        const next = {
            ...emptyAutonomy(),
            ...$state.snapshot(incoming ?? {})
        };
        next.memory = Array.isArray(next.memory) ? next.memory : [];
        next.goals = Array.isArray(next.goals) ? next.goals : [];
        next.rules = Array.isArray(next.rules) ? next.rules : [];
        draft = next;
    });

    $effect(() => {
        if (!writeFormPropsTo) return;
        const active = nestedSwitcher.getActiveSwitch();
        const activeForm = active?.localData.form ?? {};
        const onSubmit = activeForm.onSubmit ?? submitAutonomy;
        const onCancelHandler = activeForm.onCancel ?? onCancel;
        if (writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancelHandler) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit, onCancel: onCancelHandler };
        }
    });

    $effect(() => {
        if (nestedSwitcher.getActiveSwitch() === null) {
            mainPage.enablePage();
        }
    });
</script>

{#if mainPage.isPageEnabled}
    <InputSelect
        id="autonomy-mode"
        label="Mode:"
        bind:selected={draft.mode}
        wrapDiv
        items={[{ title: 'Rule based', value: 'rule-based' }]}
    />
    <InputSwitch id="autonomy-enabled" label="Enabled?" bind:value={draft.enabled} wrapDiv />
    <InputNumber id="autonomy-decision-interval" label="Decision interval (minutes):" bind:value={draft.decisionInterval} min={1} required wrapDiv />
    <InputNumber id="autonomy-max-actions" label="Max actions per cycle:" bind:value={draft.maxActionsPerCycle} min={1} required wrapDiv />
    <div class="form-group">
        <div class="section">
            <h3>Autonomy memory</h3>
            <button type="button" class="nested-button" onclick={showMemory}>
                Configure memory ({draft.memory.length})
            </button>
        </div>
        <div class="section">
            <h3>Goals</h3>
            <button type="button" class="nested-button" onclick={showGoals}>
                Configure goals ({draft.goals.length})
            </button>
        </div>
        <div class="section">
            <h3>Rules</h3>
            <button type="button" class="nested-button" onclick={showRules}>
                Configure rules ({draft.rules.length})
            </button>
        </div>
    </div>
{:else if memoryPage.isPageEnabled}
    <div class="section">
        <h3>Autonomy memory</h3>
        <OrderedList
            bind:values={draft.memory}
            getLabel={describeVariable}
            onEdit={(_, index) => openMemoryVariable(index)}
            onDelete={(_, index) => draft.memory = draft.memory.filter((__: Record<string, any>, itemIndex: number) => itemIndex !== index)}
            emptyText="No autonomy variables yet. Add one to store actor-local memory."
        />
        <button type="button" class="nested-button" onclick={() => openMemoryVariable()}>Add memory variable</button>
    </div>
{:else if memoryFormPage.isPageEnabled}
    <FormVar
        bind:value={memoryFormData}
        editing={memoryEditing}
        bind:writeFormPropsTo={memoryFormPage.localData.form}
        onCancel={showMemory}
        onAfterSubmit={saveMemoryVariable}
    />
{:else if goalsPage.isPageEnabled}
    <div class="section">
        <h3>Goals</h3>
        <OrderedList
            bind:values={draft.goals}
            getLabel={describeGoal}
            onEdit={(_, index) => openGoal(index)}
            onDelete={(_, index) => draft.goals = draft.goals.filter((__: Record<string, any>, itemIndex: number) => itemIndex !== index)}
            emptyText="No goals yet. Add a goal to prioritize character behavior."
        />
        <button type="button" class="nested-button" onclick={() => openGoal()}>Add goal</button>
    </div>
{:else if goalFormPage.isPageEnabled}
    <InputText id="autonomy-goal-name" label="Name:" bind:value={goalData.name} required autocomplete="off" wrapDiv />
    <InputTextArea id="autonomy-goal-description" label="Description:" bind:value={goalData.description} wrapDiv />
    <InputNumber id="autonomy-goal-priority" label="Priority:" bind:value={goalData.priority} required wrapDiv />
    
    <div class="section">
        <h3>Activation conditions</h3>
        <ListConditions
            bind:values={goalData.when}
            switcher={nestedSwitcher}
            page={goalWhenPage}
            onCancel={showGoalForm}
            onAfterSubmit={showGoalForm}
        />
    </div>
    <div class="section">
        <h3>Stay active conditions</h3>
        <ListConditions
            bind:values={goalData.stayActiveIf}
            switcher={nestedSwitcher}
            page={goalStayActivePage}
            onCancel={showGoalForm}
            onAfterSubmit={showGoalForm}
        />
    </div>
{:else if goalWhenPage.isPageEnabled}
    <h3>Goal activation conditions</h3>
    <ListConditions
        bind:values={goalData.when}
        switcher={nestedSwitcher}
        page={goalWhenPage}
        onCancel={showGoalForm}
        onAfterSubmit={showGoalForm}
    />
{:else if goalStayActivePage.isPageEnabled}
    <h3>Goal stay active conditions</h3>
    <ListConditions
        bind:values={goalData.stayActiveIf}
        switcher={nestedSwitcher}
        page={goalStayActivePage}
        onCancel={showGoalForm}
        onAfterSubmit={showGoalForm}
    />
{:else if rulesPage.isPageEnabled}
    <div class="section">
        <h3>Rules</h3>
        <OrderedList
            bind:values={draft.rules}
            getLabel={describeRule}
            onEdit={(_, index) => openRule(index)}
            onDelete={(_, index) => draft.rules = draft.rules.filter((__: Record<string, any>, itemIndex: number) => itemIndex !== index)}
            emptyText="No rules yet. Add a rule to define autonomous behavior."
        />
        <button type="button" class="nested-button" onclick={() => openRule()}>Add rule</button>
    </div>
{:else if ruleFormPage.isPageEnabled}
    <InputSelect
        id="autonomy-rule-type"
        label="Rule type:"
        bind:selected={ruleData.type}
        wrapDiv
        items={[
            { title: 'Action rule', value: 'action-rule' },
            { title: 'Idle rule', value: 'idle-rule' }
        ]}
    />
    <InputText id="autonomy-rule-name" label="Name:" bind:value={ruleData.name} required autocomplete="off" wrapDiv />
    <InputTextArea id="autonomy-rule-description" label="Description:" bind:value={ruleData.description} wrapDiv />
    <InputNumber id="autonomy-rule-priority" label="Priority:" bind:value={ruleData.priority} required wrapDiv />
    <InputSelect id="autonomy-rule-goal" label="Goal:" bind:selected={ruleData.goal} wrapDiv items={goalItems} />
    {#if ruleData.type === 'action-rule'}
        <InputSelect id="autonomy-rule-action" label="Action:" bind:selected={ruleData.actionName} wrapDiv items={actionItems} />
        <InputNumber id="autonomy-rule-weight" label="Weight:" bind:value={ruleData.weight} min={0} wrapDiv />
        <InputNumber id="autonomy-rule-cooldown" label="Cooldown:" bind:value={ruleData.cooldown} min={0} wrapDiv />
        <InputSelect id="autonomy-rule-targeting" label="Target selection:" bind:selected={ruleData.targeting} wrapDiv items={[
            { title: 'First valid target', value: 'firstValid' },
            { title: 'Random valid target', value: 'randomValid' },
            { title: 'All valid targets', value: 'allValid' }
        ]} />
    {:else}
        <InputNumber id="autonomy-rule-duration" label="Idle duration (minutes):" bind:value={ruleData.duration} min={0} wrapDiv />
    {/if}
    <div class="section">
        <h3>Conditions</h3>
        <ListConditions
            bind:values={ruleData.when}
            switcher={nestedSwitcher}
            page={ruleWhenPage}
            onCancel={showRuleForm}
            onAfterSubmit={showRuleForm}
        />
    </div>
{:else if ruleWhenPage.isPageEnabled}
    <h3>Rule conditions</h3>
    <ListConditions
        bind:values={ruleData.when}
        switcher={nestedSwitcher}
        page={ruleWhenPage}
        onCancel={showRuleForm}
        onAfterSubmit={showRuleForm}
    />
{/if}

<style>
    .section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.75rem 0;
    }
    .section h3 {
        margin: 0;
        font-size: 1rem;
    }
    .nested-button {
        width: 100%;
        padding: 0.5rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }
    .nested-button:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>
