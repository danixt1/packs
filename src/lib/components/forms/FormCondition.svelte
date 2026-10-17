<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import { InputSelect, InputText } from "$lib/components/inputs";
    import { showError } from "$lib/notify";
    import type { ConditionalList } from "$lib/types/data/declarative";
    import { describeOperand } from "$lib/shared/conditionalList";
    import Form from "../Form.svelte";
    import FormGetter from "./FormGetter.svelte";
    import FormValue from "./FormValue.svelte";
    import type { GettersType } from "$lib/types/data/getters";

    type OperandName = 'left' | 'right' | 'variableToCheck';
    type OperandMode = 'getter' | 'value';
    type PrimitiveValue = string | number | boolean;

    interface ConditionData {
        type?: 'condition-relational' | 'condition-exists' | 'condition-is-valid';
        operator?: '>' | '<' | '==' | '!=';
        left?: Record<string, any> | PrimitiveValue;
        right?: Record<string, any> | PrimitiveValue;
        variableToCheck?: Record<string, any> | PrimitiveValue;
        description?: string;
    }

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data: ConditionalList) => void;
        value?: ConditionData;
        stack?: ContextStack;
        autoAttach?: Record<string, any>;
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
        allowedGetters?:GettersType[];
    }

    let {
        onCancel,
        onAfterSubmit,
        value: data = $bindable<ConditionData>({}),
        stack,
        autoAttach = $bindable(),
        attachTo,
        writeFormPropsTo = $bindable(),
        allowedGetters
    }: Props = $props();

    let activeEditor = $state<'condition' | OperandName>('condition');
    let operandMode = $state<OperandMode>('getter');
    let nestedFormProps = $state<Record<string, any>>({});
    let nestedFormKey = $state(0);
    let operandValue = $state<any>();
    let activeOperand = $derived(activeEditor === 'condition' ? null : activeEditor);
    let activeValue = $derived(activeOperand ? data[activeOperand] : undefined);
    let description = $state(data.description ?? '');

    async function handleStackOperand(name: OperandName) {
        if (!stack) return;
        const currentVal = data[name];
        const isGetter = currentVal && typeof currentVal === 'object' && currentVal.type === 'getter';
        const initialMode: OperandMode = isGetter ? 'getter' : 'value';

        const result = await stack.push<any, any>({
            title: `Configure ${name}`,
            data: { mode: initialMode, val: currentVal },
            render: renderOperandForm
        });

        if (result) {
            data[name] = result;
        }
    }

    function openOperand(name: OperandName) {
        if (stack) {
            handleStackOperand(name);
            return;
        }
        activeEditor = name;
        operandValue = data[name];
        operandMode = data[name] && typeof data[name] === 'object' && data[name].type === 'getter' ? 'getter' : 'value';
        nestedFormKey += 1;
    }

    $effect(() => {
        description = data.description ?? '';
    });

    $effect(() => {
        data.description = description || undefined;
    });

    function returnToCondition() {
        activeEditor = 'condition';
        nestedFormProps = {};
        nestedFormKey += 1;
    }

    function submitCondition() {
        const type = data.type ?? 'condition-relational';
        const condition: Record<string, any> = { type };
        if (type === 'condition-relational') {
            if (data.left === undefined || data.right === undefined) {
                showError('Set both left and right values');
                return;
            }
            condition.operator = data.operator ?? '==';
            condition.left = data.left;
            condition.right = data.right;
        } else {
            if (data.variableToCheck === undefined) {
                showError('Set the value to check');
                return;
            }
            condition.variableToCheck = data.variableToCheck;
        }
        if (data.description) {
            condition.description = data.description;
        }
        if (autoAttach && attachTo) {
            autoAttach[attachTo] = condition;
        }
        onAfterSubmit?.(condition as ConditionalList);
    }

    function submitActive() {
        if (activeEditor === 'condition') {
            submitCondition();
        } else {
            nestedFormProps.onSubmit?.();
        }
    }

    function cancelActive() {
        if (activeEditor === 'condition') {
            onCancel?.();
        } else {
            returnToCondition();
        }
    }

    $effect(() => {
        if (!writeFormPropsTo) {
            return;
        }
        const onSubmit = submitActive;
        const onCancelHandler = cancelActive;
        if (writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancelHandler) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit, onCancel: onCancelHandler };
        }
    });
</script>

{#snippet renderOperandForm(frame: any)}
    {@const currentVal = frame.draft.val}
    <div class="operand-editor">
        <InputSelect
            id="operand-mode"
            label="Value source:"
            wrapDiv
            bind:selected={frame.draft.mode}
            items={[
                { title: 'Getter', value: 'getter' },
                { title: 'Literal value', value: 'value' }
            ]}
        />
        {#if frame.draft.mode === 'getter'}
            <FormGetter
                value={typeof currentVal === 'object' && currentVal?.type === 'getter' ? currentVal : {}}
                onAfterSubmit={(val) => frame.resolve(val)}
                onCancel={() => frame.cancel()}
                {allowedGetters}
            />
        {:else}
            <FormValue
                value={typeof currentVal === 'object' ? '' : (currentVal ?? '')}
                onAfterSubmit={(val) => frame.resolve(val)}
                onCancel={() => frame.cancel()}
            />
        {/if}
    </div>
{/snippet}

{#snippet inputs()}
    {#if activeEditor === 'condition'}
        <InputSelect
            id="condition-type"
            label="Condition Type:"
            items={[
                { title: 'Relational', value: 'condition-relational' },
                { title: 'Exists', value: 'condition-exists' },
                { title: 'Is Valid', value: 'condition-is-valid' }
            ]}
            bind:selected={data.type}
            wrapDiv
        />
        {#if data.type === 'condition-relational' || data.type === undefined}
            <div class="form-group">
                <button type="button" class="operand-button" onclick={() => openOperand('left')}>
                    {data.left === undefined ? 'left' : describeOperand(data.left)}
                </button>
                <InputSelect
                    id="condition-operator"
                    items={[
                        { title: '==', value: '==' },
                        { title: '!=', value: '!=' },
                        { title: '>', value: '>' },
                        { title: '<', value: '<' }
                    ]}
                    bind:selected={data.operator}
                    label="Operation:"
                />
                <button type="button" class="operand-button" onclick={() => openOperand('right')}>
                    {data.right === undefined ? 'right' : describeOperand(data.right)}
                </button>
            </div>
        {:else}
            <div class="form-group">
                <button type="button" class="operand-button" onclick={() => openOperand('variableToCheck')}>
                    {data.variableToCheck === undefined ? 'Check' : describeOperand(data.variableToCheck)}
                </button>
            </div>
        {/if}
        <InputText id="condition-description" label="Description" wrapDiv bind:value={description} autocomplete="off" />
    {:else}
        <InputSelect
            id="operand-mode"
            label="Value source:"
            wrapDiv
            bind:selected={operandMode}
            items={[
                { title: 'Getter', value: 'getter' },
                { title: 'Literal value', value: 'value' }
            ]}
        />
        {#if activeOperand}
            {#key nestedFormKey}
                {#if operandMode === 'getter'}
                    <FormGetter
                        bind:value={operandValue}
                        bind:autoAttach={data}
                        attachTo={activeOperand}
                        bind:writeFormPropsTo={nestedFormProps}
                        onAfterSubmit={returnToCondition}
                        onCancel={returnToCondition}
                        {allowedGetters}
                    />
                {:else}
                    <FormValue
                        bind:value={operandValue}
                        bind:autoAttach={data}
                        attachTo={activeOperand}
                        bind:writeFormPropsTo={nestedFormProps}
                        onAfterSubmit={returnToCondition}
                        onCancel={returnToCondition}
                    />
                {/if}
            {/key}
        {/if}
    {/if}
{/snippet}

{#if writeFormPropsTo}
    {@render inputs()}
{:else}
    <Form onSubmit={submitActive} onCancel={cancelActive}>
        {@render inputs()}
    </Form>
{/if}

<style>
    .form-group {
        display: flex;
        gap: 0.5rem;
    }
    .operand-button {
        width: 100%;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.5rem 1rem;
    }
    .operand-button:hover{
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>
