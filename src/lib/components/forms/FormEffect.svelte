<script lang="ts">
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import { showError } from "$lib/notify";
    import type { EffectFomAction } from "$lib/types/data/declarative";
    import Form from "../Form.svelte";
    import FormGetter from "./FormGetter.svelte";
    import FormRandomValue from "./FormRandomValue.svelte";
    import FormValue from "./FormValue.svelte";
    import ListConditions from "../lists/ListConditions.svelte";
    import ListEffects from "../lists/ListEffects.svelte";
    import { InputSelect, InputText, InputTextArea } from "../inputs";

    type EffectType = EffectFomAction['type'];
    type PrimitiveValue = string | number | boolean;

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data: EffectFomAction) => void;
        value?: EffectFomAction;
        autoAttach?: Record<string, any>;
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
    }

    let {
        onCancel,
        onAfterSubmit,
        value = $bindable<EffectFomAction>(),
        autoAttach = $bindable(),
        attachTo,
        writeFormPropsTo = $bindable()
    }: Props = $props();

    let data = $state<Record<string, any>>({});
    let selectedType = $state<EffectType>('event');
    let targetIdMode = $state<'getter' | 'value'>('getter');
    let literalValue = $state<PrimitiveValue>('');
    let randomValue = $state<{ type: 'random-interval' | 'random-value'; min?: number; max?: number; values?: (string | number)[]; tempVarName?: string }>({ type: 'random-value', values: [] });
    let nestedGetterProps = $state<Record<string, any>>({});
    let nestedValueProps = $state<Record<string, any>>({});
    let nestedRandomProps = $state<Record<string, any>>({});
    let nestedSwitcher = createPageSwitch();
    let mainPage = nestedSwitcher.createSwitch({}, 'effect');
    type NestedEditor =
        | 'conditions'
        | 'onTrue'
        | 'onFalse'
        | 'moveId'
        | 'toId'
        | 'setterVar'
        | 'setterValue'
        | 'setterRandom'
        | 'targetId';
    let activeNested = $state<NestedEditor | null>(null);
    let lastValue: EffectFomAction | undefined;
    let hasLoadedValue = false;

    onDestroy(() => {
        nestedSwitcher.switches.forEach((child) => child.remove());
    });

    const effectOptions = [
        { title: 'Move', value: 'move' },
        { title: 'Event', value: 'event' },
        { title: 'Conditional', value: 'conditional' },
        { title: 'Set variable', value: 'setter' },
        { title: 'Start dialogue', value: 'start-dialogue' }
    ];

    $effect(() => {
        if (hasLoadedValue && value === lastValue) return;
        data = $state.snapshot(value ?? { type: 'event', event: '' });
        selectedType = data.type ?? 'event';
        targetIdMode = data.targetId && typeof data.targetId === 'object' ? 'getter' : 'value';
        literalValue = typeof data.value === 'object' ? '' : (data.value ?? '');
        randomValue = typeof data.value === 'object' && data.value.type ? $state.snapshot(data.value) : { type: 'random-value', values: [] };
        data._valueKind = typeof data.value === 'object' ? 'random' : 'literal';
        lastValue = value;
        hasLoadedValue = true;
    });

    function createDefaults(type: EffectType): Record<string, any> {
        switch (type) {
            case 'move': return { type, moveId: {}, toId: {} };
            case 'event': return { type, event: '' };
            case 'conditional': return { type, conditions: [], onTrue: [], onFalse: [] };
            case 'setter': return { type, var: {}, mode: 'set', value: '' };
            case 'start-dialogue': return { type, intent: '' };
        }
    }

    function changeType(type: EffectType) {
        if (type !== data.type) {
            data = createDefaults(type);
            targetIdMode = 'getter';
            literalValue = '';
            randomValue = { type: 'random-value', values: [] };
            data._valueKind = 'literal';
        }
        selectedType = type;
    }

    function submitNestedEditors() {
        if (activeNested === 'moveId' || activeNested === 'toId' || activeNested === 'setterVar' || activeNested === 'targetId') {
            nestedGetterProps.onSubmit?.();
        } else if (activeNested === 'setterValue') {
            nestedValueProps.onSubmit?.();
        } else if (activeNested === 'setterRandom') {
            nestedRandomProps.onSubmit?.();
        }
    }

    function onSubmit() {
        submitNestedEditors();
        if (!data.type) {
            showError('Select an effect type');
            return;
        }
        if (data.type === 'event' && !data.event?.trim()) {
            showError('Add an event name');
            return;
        }
        if (data.type === 'setter' && !data.var?.type) {
            showError('Select the variable to modify');
            return;
        }
        if (data.type === 'conditional') {
            data.conditions ??= [];
            data.onTrue ??= [];
            if (!data.onTrue.length) {
                showError('Add at least one effect to the true branch');
                return;
            }
        }
        const result = $state.snapshot(data) as Record<string, any>;
        delete result._valueKind;
        delete result._eventData;
        if (autoAttach && attachTo) autoAttach[attachTo] = result;
        value = result as EffectFomAction;
        onAfterSubmit?.(result as EffectFomAction);
    }

    function submitActive() {
        if (activeNested) {
            if (activeNested === 'conditions' || activeNested === 'onTrue' || activeNested === 'onFalse') {
                nestedSwitcher.getActiveSwitch()?.localData.form?.onSubmit?.();
                return;
            }
            submitNestedEditors();
            return;
        }
        const active = nestedSwitcher.getActiveSwitch();
        if (active && active !== mainPage) {
            active.localData.form?.onSubmit?.();
            return;
        }
        onSubmit();
    }

    function cancelActive() {
        if (activeNested === 'conditions' || activeNested === 'onTrue' || activeNested === 'onFalse') {
            nestedSwitcher.getActiveSwitch()?.localData.form?.onCancel?.();
            return;
        }
        if (activeNested) {
            closeNested();
            return;
        }
        const active = nestedSwitcher.getActiveSwitch();
        if (active && active !== mainPage) {
            active.localData.form?.onCancel?.();
            return;
        }
        onCancel?.();
    }

    function openNested(name: NestedEditor) {
        activeNested = name;
    }

    function closeNested() {
        activeNested = null;
        mainPage.enablePage();
    }

    $effect(() => {
        if (writeFormPropsTo && (writeFormPropsTo.onSubmit !== submitActive || writeFormPropsTo.onCancel !== cancelActive)) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit: submitActive, onCancel: cancelActive };
        }
    });

    $effect(() => {
        if (selectedType === 'setter' && typeof data.value !== 'object') {
            literalValue = data.value ?? '';
        }
    });
</script>

{#snippet inputs()}
    {#if nestedSwitcher.getActiveSwitch() === mainPage && activeNested === null}
        <InputSelect
            id="effect-type"
            label="Effect type:"
            wrapDiv
            selected={selectedType}
            onchange={(event) => changeType((event.currentTarget as HTMLSelectElement).value as EffectType)}
            items={effectOptions}
        />

        {#if selectedType === 'move'}
            <div class="form-group">
                <button type="button" class="nested-button" onclick={() => openNested('moveId')}>Edit character to move</button>
                <button type="button" class="nested-button" onclick={() => openNested('toId')}>Edit destination</button>
            </div>
        {:else if selectedType === 'event'}
            <InputText id="effect-event" label="Event:" wrapDiv bind:value={data.event} autocomplete="off" />
            <InputSelect id="effect-filter" label="Emit only if:" wrapDiv bind:selected={data.emitOnlyIf} items={[
                { title: 'Always', value: '' },
                { title: 'Same place as player', value: 'inTheSamePlaceAsPlayer' },
                { title: 'Actor is player', value: 'actorIsPlayer' },
                { title: 'Target is player', value: 'targetIsPlayer' },
                { title: 'Actor is non-player', value: 'actorIsNonPlayer' },
                { title: 'Target is non-player', value: 'targetIsNonPlayer' }
            ]} />
            <InputSelect id="effect-audience" label="Audience:" wrapDiv selected={data.context?.audience} onchange={(event) => {
                data.context ??= {};
                data.context.audience = (event.currentTarget as HTMLSelectElement).value || undefined;
            }} items={[
                { title: 'Global', value: 'global' },
                { title: 'Actor', value: 'actor' },
                { title: 'Target', value: 'target' },
                { title: 'Place', value: 'place' }
            ]} />
            <InputTextArea id="effect-event-data" label="Event data (JSON):" bind:value={data._eventData} />
        {:else if selectedType === 'setter'}
            <div class="form-group">
                <button type="button" class="nested-button" onclick={() => openNested('setterVar')}>Edit variable getter</button>
            </div>
            <InputSelect id="effect-mode" label="Mode:" wrapDiv bind:selected={data.mode} items={[
                { title: 'Set', value: 'set' },
                { title: 'Increment', value: 'increment' },
                { title: 'Decrement', value: 'decrement' },
                { title: 'Multiply', value: 'multiply' },
                { title: 'Divide', value: 'divide' }
            ]} />
            <InputSelect id="effect-value-kind" label="Value source:" wrapDiv bind:selected={data._valueKind} items={[
                { title: 'Literal', value: 'literal' },
                { title: 'Random', value: 'random' }
            ]} />
            {#if data._valueKind === 'random'}
                <div class="form-group">
                    <button type="button" class="nested-button" onclick={() => openNested('setterRandom')}>Edit random value</button>
                </div>
            {:else}
                <div class="form-group">
                    <button type="button" class="nested-button" onclick={() => openNested('setterValue')}>Edit literal value</button>
                </div>
            {/if}
        {:else if selectedType === 'start-dialogue'}
            <InputText id="effect-dialogue-id" label="Dialogue id:" wrapDiv bind:value={data.dialogueId} autocomplete="off" />
            <InputText id="effect-intent" label="Intent:" wrapDiv bind:value={data.intent} autocomplete="off" />
            <div class="form-group">
                <button type="button" class="nested-button" onclick={() => openNested('targetId')}>Edit target getter</button>
            </div>
        {:else if selectedType === 'conditional'}
            <div class="form-group">
                <button type="button" class="nested-button" onclick={() => openNested('conditions')}>Configure conditions ({data.conditions?.length ?? 0})</button>
                <button type="button" class="nested-button" onclick={() => openNested('onTrue')}>Configure true effects ({data.onTrue?.length ?? 0})</button>
                <button type="button" class="nested-button" onclick={() => openNested('onFalse')}>Configure false effects ({data.onFalse?.length ?? 0})</button>
            </div>
        {/if}
    {:else if activeNested === 'moveId'}
        <FormGetter
            value={data.moveId}
            bind:autoAttach={data}
            attachTo="moveId"
            bind:writeFormPropsTo={nestedGetterProps}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'toId'}
        <FormGetter
            value={data.toId}
            bind:autoAttach={data}
            attachTo="toId"
            bind:writeFormPropsTo={nestedGetterProps}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'setterVar'}
        <FormGetter
            value={data.var}
            bind:autoAttach={data}
            attachTo="var"
            bind:writeFormPropsTo={nestedGetterProps}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'setterValue'}
        <FormValue
            value={literalValue}
            bind:autoAttach={data}
            attachTo="value"
            bind:writeFormPropsTo={nestedValueProps}
            onAfterSubmit={(next) => {
                literalValue = next;
                closeNested();
            }}
            onCancel={closeNested}
        />
    {:else if activeNested === 'setterRandom'}
        <FormRandomValue
            value={randomValue}
            bind:autoAttach={data}
            attachTo="value"
            bind:writeFormPropsTo={nestedRandomProps}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'targetId'}
        <FormGetter
            value={data.targetId}
            bind:autoAttach={data}
            attachTo="targetId"
            bind:writeFormPropsTo={nestedGetterProps}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'conditions'}
        <ListConditions bind:values={data.conditions} switcher={nestedSwitcher} onCancel={closeNested} onAfterSubmit={closeNested} />
    {:else if activeNested === 'onTrue'}
        <ListEffects bind:values={data.onTrue} switcher={nestedSwitcher} onCancel={closeNested} onAfterSubmit={closeNested} />
    {:else if activeNested === 'onFalse'}
        <ListEffects bind:values={data.onFalse} switcher={nestedSwitcher} onCancel={closeNested} onAfterSubmit={closeNested} />
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
    .nested-button {
        width: 100%;
        margin: 0.25rem 0;
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