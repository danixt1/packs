<script lang="ts">
    import { showError } from "$lib/notify";
    import Form from "../Form.svelte";
    import InputNumber from "../inputs/InputNumber.svelte";
    import InputSelect from "../inputs/InputSelect.svelte";
    import InputSwitch from "../inputs/InputSwitch.svelte";
    import InputText from "../inputs/InputText.svelte";

    type ValueType = 'string' | 'number' | 'boolean';
    type PrimitiveValue = string | number | boolean;

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (value: PrimitiveValue) => void;
        value?: PrimitiveValue;
        /** Object that receives the raw value when `attachTo` is provided. */
        autoAttach?: Record<string, any>;
        /** Property in `autoAttach` that receives the raw value. */
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
    }

    let {
        onCancel,
        onAfterSubmit,
        value = $bindable(),
        autoAttach = $bindable(),
        attachTo,
        writeFormPropsTo = $bindable()
    }: Props = $props();

    let selectedType = $state<ValueType>(typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string');
    let textValue = $state(typeof value === 'string' ? value : '');
    let numberValue = $state(typeof value === 'number' ? value : undefined);
    let booleanValue = $state(typeof value === 'boolean' ? value : false);

    $effect(() => {
        if (value === undefined) {
            selectedType = 'string';
            textValue = '';
            numberValue = undefined;
            booleanValue = false;
            return;
        }

        if (typeof value === 'number') {
            selectedType = 'number';
            numberValue = value;
        } else if (typeof value === 'boolean') {
            selectedType = 'boolean';
            booleanValue = value;
        } else {
            selectedType = 'string';
            textValue = value;
        }
    });

    function onSubmit() {
        let rawValue: PrimitiveValue;
        if (selectedType === 'number') {
            if (numberValue === undefined || Number.isNaN(numberValue)) {
                showError('Add a valid number value');
                return;
            }
            rawValue = numberValue;
        } else if (selectedType === 'boolean') {
            rawValue = booleanValue;
        } else {
            rawValue = textValue;
        }

        value = rawValue;
        if (autoAttach && attachTo) {
            autoAttach[attachTo] = rawValue;
        }
        onAfterSubmit?.(rawValue);
    }

    $effect(() => {
        if (!writeFormPropsTo) {
            return;
        }
        if (writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancel) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit, onCancel };
        }
    });
</script>

{#snippet inputs()}
    <InputSelect
        id="value-type"
        label="Type:"
        wrapDiv
        bind:selected={selectedType}
        items={[
            { title: 'String', value: 'string' },
            { title: 'Number', value: 'number' },
            { title: 'Boolean', value: 'boolean' }
        ]}
    />
    {#if selectedType === 'number'}
        <InputNumber id="value-number" label="Value:" wrapDiv bind:value={numberValue} />
    {:else if selectedType === 'boolean'}
        <InputSwitch id="value-boolean" label="Value:" wrapDiv bind:value={booleanValue} />
    {:else}
        <InputText id="value-string" label="Value:" wrapDiv bind:value={textValue} autocomplete="off" />
    {/if}
{/snippet}

{#if writeFormPropsTo}
    {@render inputs()}
{:else}
    <Form onSubmit={onSubmit} onCancel={onCancel}>
        {@render inputs()}
    </Form>
{/if}