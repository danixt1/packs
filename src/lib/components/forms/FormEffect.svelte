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
    import { InputNumber, InputSelect, InputSwitch, InputText } from "../inputs";

    type EffectType = EffectFomAction['type'];
    type PrimitiveValue = string | number | boolean;
    interface EventField {
        name: string;
        kind: 'literal' | 'getter';
        valueType: 'string' | 'number' | 'boolean';
        value: any;
    }

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
    let eventFieldGetterProps = $state<Record<string, any>>({});
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
        | 'targetId'
        | 'eventFieldGetter';
    let activeNested = $state<NestedEditor | null>(null);
        
    let eventContextFields = $state<EventField[]>([]);
    let eventDataFields = $state<EventField[]>([]);
    let eventContextTags = $state<string[]>([]);
    let eventFieldTarget = $state<EventField | null>(null);

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
        eventContextFields = Object.entries(data.context ?? {})
            .filter(([key]) => ['actorId', 'targetId', 'subjectId', 'placeId'].includes(key))
            .map(([name, fieldValue]) => ({ name, kind: typeof fieldValue === 'object' ? 'getter' : 'literal', valueType: 'string', value: fieldValue }));
        eventDataFields = Object.entries(data.data ?? {}).map(([name, fieldValue]) => ({
            name,
            kind: typeof fieldValue === 'object' ? 'getter' : 'literal',
            valueType: typeof fieldValue === 'number' ? 'number' : typeof fieldValue === 'boolean' ? 'boolean' : 'string',
            value: fieldValue
        }));
        eventContextTags = [...(data.context?.tags ?? [])];
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
        if (activeNested === 'moveId' || activeNested === 'toId' || activeNested === 'setterVar' || activeNested === 'targetId' || activeNested === 'eventFieldGetter') {
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
        if (data.type === 'move' && (!data.moveId?.type || !data.toId?.type)) {
            showError('Select the character and destination');
            return;
        }
        if (data.type === 'start-dialogue' && !data.dialogueId?.trim() && !data.intent?.trim()) {
            showError('Add a dialogue id or intent');
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
        if (data.type === 'event') {
            const contextNames = eventContextFields.map((field) => field.name);
            if (contextNames.some((name) => !name)) {
                showError('Choose a context field for every row');
                return;
            }
            if (new Set(contextNames).size !== contextNames.length) {
                showError('Each context field can only be added once');
                return;
            }
            if (eventDataFields.some((field) => !field.name.trim())) {
                showError('Add a name for every event data field');
                return;
            }
            const dataNames = eventDataFields.map((field) => field.name.trim());
            if (new Set(dataNames).size !== dataNames.length) {
                showError('Event data field names must be unique');
                return;
            }
            const context: Record<string, any> = {};
            for (const field of eventContextFields) context[field.name] = field.value;
            if (data.context?.audience) context.audience = data.context.audience;
            const tags = eventContextTags.map((tag) => tag.trim()).filter(Boolean);
            if (tags.length) context.tags = tags;
            data.context = Object.keys(context).length ? context : undefined;
            data.data = eventDataFields.reduce<Record<string, any>>((result, field) => {
                result[field.name.trim()] = field.value;
                return result;
            }, {});
            if (!eventDataFields.length) delete data.data;
        }
        const result = $state.snapshot(data) as Record<string, any>;
        delete result._valueKind;
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

    function editEventFieldGetter(field: EventField) {
        eventFieldTarget = field;
        activeNested = 'eventFieldGetter';
    }

    function addContextField() {
        const usedFields = new Set(eventContextFields.map((field) => field.name));
        const nextField = ['actorId', 'targetId', 'subjectId', 'placeId'].find((field) => !usedFields.has(field));
        if (nextField) eventContextFields = [...eventContextFields, { name: nextField, kind: 'literal', valueType: 'string', value: '' }];
    }

    function addEventDataField() {
        eventDataFields = [...eventDataFields, { name: '', kind: 'literal', valueType: 'string', value: '' }];
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
        <section class="effect-type-selector" aria-labelledby="effect-type-heading">
            <h2 id="effect-type-heading">Choose an effect</h2>
            <p>This choice determines which effect you are adding</p>
            <InputSelect
                id="effect-type"
                label="Effect type:"
                selected={selectedType}
                onchange={(event) => changeType((event.currentTarget as HTMLSelectElement).value as EffectType)}
                items={effectOptions}
            />
        </section>

        <section class="effect-settings" aria-label="Effect settings">
            <div class="effect-settings-heading">
                <h3>Effect settings</h3>
                <span>{effectOptions.find((option) => option.value === selectedType)?.title}</span>
            </div>
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
            <section class="event-fields" aria-label="Event context">
                <div class="event-fields-heading">
                    <h4>Context</h4>
                    <button type="button" class="nested-button" onclick={addContextField} disabled={eventContextFields.length >= 4}>Add context field</button>
                </div>
                {#each eventContextFields as field, index (index)}
                    <div class="event-field-row">
                        <InputSelect id={`event-context-field-${index}`} label="Field:" bind:selected={field.name} items={[
                            { title: 'Actor ID', value: 'actorId' },
                            { title: 'Target ID', value: 'targetId' },
                            { title: 'Subject ID', value: 'subjectId' },
                            { title: 'Place ID', value: 'placeId' }
                        ]} />
                        <InputSelect id={`event-context-kind-${index}`} label="Value source:" bind:selected={field.kind} items={[
                            { title: 'Literal ID', value: 'literal' },
                            { title: 'Getter', value: 'getter' }
                        ]} />
                        {#if field.kind === 'getter'}
                            <button type="button" class="nested-button" onclick={() => editEventFieldGetter(field)}>Edit getter</button>
                        {:else}
                            <InputText id={`event-context-value-${index}`} label="Value:" bind:value={field.value} autocomplete="off" />
                        {/if}
                        <button type="button" class="remove-field" aria-label={`Remove context field ${index + 1}`} onclick={() => eventContextFields = eventContextFields.filter((_, fieldIndex) => fieldIndex !== index)}>Remove</button>
                    </div>
                {/each}
                <InputSelect id="effect-audience" label="Audience:" wrapDiv selected={data.context?.audience ?? ''} onchange={(event) => {
                    data.context ??= {};
                    data.context.audience = (event.currentTarget as HTMLSelectElement).value || undefined;
                }} items={[
                    { title: 'Not specified', value: '' },
                    { title: 'Global', value: 'global' },
                    { title: 'Actor', value: 'actor' },
                    { title: 'Target', value: 'target' },
                    { title: 'Place', value: 'place' }
                ]} />
                <div class="event-fields-heading">
                    <h4>Tags</h4>
                    <button type="button" class="nested-button" onclick={() => eventContextTags = [...eventContextTags, '']}>Add tag</button>
                </div>
                {#each eventContextTags as tag, index (index)}
                    <div class="event-field-row">
                        <InputText id={`event-context-tag-${index}`} label={`Tag ${index + 1}:`} bind:value={eventContextTags[index]} autocomplete="off" />
                        <button type="button" class="remove-field" aria-label={`Remove tag ${index + 1}`} onclick={() => eventContextTags = eventContextTags.filter((_, tagIndex) => tagIndex !== index)}>Remove</button>
                    </div>
                {/each}
            </section>
            <section class="event-fields" aria-label="Event data">
                <div class="event-fields-heading">
                    <h4>Event data</h4>
                    <button type="button" class="nested-button" onclick={addEventDataField}>Add data field</button>
                </div>
                {#each eventDataFields as field, index (index)}
                    <div class="event-field-row">
                        <InputText id={`event-data-name-${index}`} label="Name:" bind:value={field.name} autocomplete="off" />
                        <InputSelect id={`event-data-kind-${index}`} label="Value source:" bind:selected={field.kind} items={[
                            { title: 'Literal', value: 'literal' },
                            { title: 'Getter', value: 'getter' }
                        ]} />
                        {#if field.kind === 'getter'}
                            <button type="button" class="nested-button" onclick={() => editEventFieldGetter(field)}>Edit getter</button>
                        {:else}
                            <InputSelect id={`event-data-type-${index}`} label="Value type:" bind:selected={field.valueType} items={[
                                { title: 'Text', value: 'string' },
                                { title: 'Number', value: 'number' },
                                { title: 'Boolean', value: 'boolean' }
                            ]} />
                            {#if field.valueType === 'number'}
                                <InputNumber id={`event-data-value-${index}`} label="Value:" bind:value={field.value} />
                            {:else if field.valueType === 'boolean'}
                                <InputSwitch id={`event-data-value-${index}`} label="Value:" bind:value={field.value} />
                            {:else}
                                <InputText id={`event-data-value-${index}`} label="Value:" bind:value={field.value} autocomplete="off" />
                            {/if}
                        {/if}
                        <button type="button" class="remove-field" aria-label={`Remove event data field ${index + 1}`} onclick={() => eventDataFields = eventDataFields.filter((_, fieldIndex) => fieldIndex !== index)}>Remove</button>
                    </div>
                {/each}
            </section>
        {:else if selectedType === 'setter'}
            <div class="form-group">
                <h3>With Variable:</h3>
                <button type="button" class="nested-button" onclick={() => openNested('setterVar')}>Edit variable getter</button>
            </div>
            <div class="form-group">
                <div class="zone">
                    <h3>Set the Value:</h3>
                    <InputSelect id="effect-mode" label="Mode:" bind:selected={data.mode} items={[
                        { title: 'Set', value: 'set' },
                        { title: 'Increment', value: 'increment' },
                        { title: 'Decrement', value: 'decrement' },
                        { title: 'Multiply', value: 'multiply' },
                        { title: 'Divide', value: 'divide' }
                    ]} />
                    <InputSelect id="effect-value-kind" label="Value source:" bind:selected={data._valueKind} items={[
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
                </div>
            </div>
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
        </section>
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
    {:else if activeNested === 'eventFieldGetter' && eventFieldTarget}
        <FormGetter
            value={eventFieldTarget.value}
            bind:autoAttach={eventFieldTarget}
            attachTo="value"
            bind:writeFormPropsTo={eventFieldGetterProps}
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
    .effect-type-selector {
        margin: 0.75rem 1rem 1rem;
        padding: 1rem;
        border: 1px solid var(--border-strong);
        border-left: 4px solid var(--color-accent);
        border-radius: 8px;
        background: linear-gradient(115deg, rgba(215, 177, 115, 0.13), rgba(215, 177, 115, 0.035));
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
    }
    .effect-type-selector h2 {
        margin: 0;
        color: var(--color-text-bright);
        font-size: 1.1rem;
    }
    .effect-type-selector p {
        margin: 0.35rem 0 0.75rem;
        color: var(--color-text);
        font-size: 0.9rem;
        line-height: 1.45;
    }
    .effect-type-selector :global(.def-label) {
        font-size: 0.95rem;
    }
    .effect-type-selector :global(.def-select) {
        min-height: 2.8rem;
        padding: 0.65rem 2.5rem 0.65rem 0.8rem;
        border: 1px solid var(--color-accent);
        border-radius: 6px;
        background-color: var(--bg-panel-solid);
        box-shadow: 0 0 0 2px rgba(215, 177, 115, 0.12);
        font-size: 1rem;
        font-weight: 600;
    }
    .effect-type-selector :global(.def-select:focus-visible) {
        outline: 2px solid var(--color-accent-light);
        outline-offset: 2px;
    }
    .effect-settings {
        margin: 0 1rem 1rem;
        padding: 0.75rem;
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.025);
    }
    .effect-settings-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
        padding: 0 0.25rem 0.65rem;
        border-bottom: 1px solid var(--border-subtle);
    }
    .effect-settings-heading h3 {
        margin: 0;
        color: var(--color-text);
        font-size: 0.95rem;
    }
    .effect-settings-heading span {
        padding: 0.2rem 0.55rem;
        border: 1px solid var(--border-strong);
        border-radius: 999px;
        color: var(--color-text-bright);
        background: rgba(215, 177, 115, 0.08);
        font-size: 0.8rem;
        font-weight: 600;
    }
    .zone{
        border: 1px solid var(--border-subtle);
        border-radius: 5px;
        padding: 1px 5px 15px 5px;
    }
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
    .nested-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }
    .event-fields {
        display: grid;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.75rem;
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.02);
    }
    .event-fields-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }
    .event-fields-heading h4 {
        margin: 0;
        color: var(--color-text-bright);
    }
    .event-field-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        align-items: end;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 1px solid var(--border-subtle);
        border-radius: 5px;
    }
    .remove-field {
        min-height: 2rem;
        padding: 0.35rem 0.6rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }
    .remove-field:hover {
        border-color: var(--color-accent);
        background: var(--bg-card-hover);
    }
</style>