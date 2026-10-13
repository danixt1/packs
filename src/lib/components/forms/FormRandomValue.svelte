<script lang="ts">
    import { showError } from "$lib/notify";
    import Form from "../Form.svelte";
    import InputNumber from "../inputs/InputNumber.svelte";
    import InputSelect from "../inputs/InputSelect.svelte";
    import InputText from "../inputs/InputText.svelte";

    type RandomValue = {
        type: 'random-interval' | 'random-value';
        min?: number;
        max?: number;
        values?: (string | number)[];
        tempVarName?: string;
    };

    interface Props {
        value?: RandomValue;
        onCancel?: () => void;
        onAfterSubmit?: (value: RandomValue) => void;
        autoAttach?: Record<string, any>;
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
    }

    let {
        value = $bindable<RandomValue>(),
        onCancel,
        onAfterSubmit,
        autoAttach = $bindable(),
        attachTo,
        writeFormPropsTo = $bindable()
    }: Props = $props();

    let kind = $state<'random-interval' | 'random-value'>('random-value');
    let min = $state<number | undefined>();
    let max = $state<number | undefined>();
    let valuesText = $state('');
    let tempVarName = $state('');

    $effect(() => {
        if (!value) {
            return;
        }
        kind = value.type;
        min = value.min;
        max = value.max;
        valuesText = (value.values ?? []).join(', ');
        tempVarName = value.tempVarName ?? '';
    });

    function onSubmit() {
        let result: RandomValue;
        if (kind === 'random-interval') {
            if (min === undefined || max === undefined || Number.isNaN(min) || Number.isNaN(max) || min > max) {
                showError('Set a valid random interval');
                return;
            }
            result = { type: kind, min, max };
        } else {
            const values = valuesText
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item) => {
                    const numeric = Number(item);
                    return item !== '' && !Number.isNaN(numeric) ? numeric : item;
                });
            if (values.length === 0) {
                showError('Add at least one random value');
                return;
            }
            result = { type: kind, values };
        }
        if (tempVarName.trim()) {
            result.tempVarName = tempVarName.trim();
        }
        value = result;
        if (autoAttach && attachTo) {
            autoAttach[attachTo] = result;
        }
        onAfterSubmit?.(result);
    }

    $effect(() => {
        if (writeFormPropsTo && (writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancel)) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit, onCancel };
        }
    });
</script>

{#snippet inputs()}
    <InputSelect
        id="random-value-type"
        label="Random source:"
        wrapDiv
        bind:selected={kind}
        items={[
            { title: 'Interval', value: 'random-interval' },
            { title: 'Values', value: 'random-value' }
        ]}
    />
    {#if kind === 'random-interval'}
        <InputNumber id="random-min" label="Minimum:" wrapDiv bind:value={min} />
        <InputNumber id="random-max" label="Maximum:" wrapDiv bind:value={max} />
    {:else}
        <InputText
            id="random-values"
            label="Values (comma separated):"
            wrapDiv
            bind:value={valuesText}
            autocomplete="off"
        />
    {/if}
    <InputText id="random-temp-var" label="Temporary variable name:" wrapDiv bind:value={tempVarName} autocomplete="off" />
{/snippet}

{#if writeFormPropsTo}
    {@render inputs()}
{:else}
    <Form onSubmit={onSubmit} onCancel={onCancel}>
        {@render inputs()}
    </Form>
{/if}