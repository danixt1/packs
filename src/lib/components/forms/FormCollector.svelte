<script lang="ts">
    import { createPageSwitch } from "$lib/shared/pageSwitch";
    import { showError } from "$lib/notify";
    import type { CollectorToGet } from "$lib/types/data/declarative";
    import Form from "../Form.svelte";
    import { InputSelect, InputText } from "../inputs";
    import FormGetter from "./FormGetter.svelte";
    import ListConditions from "../lists/ListConditions.svelte";

    type CollectorKind = 'entity' | 'self' | 'connectedPlaces';
    type EntityTarget = 'character' | 'place' | 'item';

    interface Props {
        value?: CollectorToGet;
        onCancel?: () => void;
        onAfterSubmit?: (value: CollectorToGet) => void;
        autoAttach?: Record<string, any>;
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
    }

    let {
        value = $bindable<CollectorToGet>(),
        onCancel,
        onAfterSubmit,
        autoAttach = $bindable(),
        attachTo,
        writeFormPropsTo = $bindable()
    }: Props = $props();

    let kind = $state<CollectorKind>('entity');
    let target = $state<EntityTarget>('character');
    let collectIf = $state<any[]>([]);
    let fromPlaceId = $state<string | Record<string, any>>('');
    let getterValue = $state<Record<string, any>>({});
    let nestedFormProps = $state<Record<string, any>>({});
    let nestedSwitcher = createPageSwitch();
    let mainPage = nestedSwitcher.createSwitch({}, 'collector');
    let conditionsPage = nestedSwitcher.createSwitch({ type: 'list', name: 'condition' }, 'conditions');
    let getterPage = nestedSwitcher.createSwitch({}, 'getter');
    let activeNested = $state<'conditions' | 'getter' | null>(null);

    $effect(() => {
        if (!value) return;
        const incoming = $state.snapshot(value) as any;
        if (incoming.target === 'self') {
            kind = 'self';
            target = 'character';
            collectIf = [];
            fromPlaceId = '';
            getterValue = {};
        } else if (incoming.target === 'connectedPlaces') {
            kind = 'connectedPlaces';
            target = 'place';
            collectIf = [];
            fromPlaceId = typeof incoming.fromPlaceId === 'object' ? incoming.fromPlaceId : (incoming.fromPlaceId ?? '');
            getterValue = typeof incoming.fromPlaceId === 'object' ? incoming.fromPlaceId : {};
        } else {
            kind = 'entity';
            target = incoming.target ?? 'character';
            collectIf = [...(incoming.collectIf ?? [])];
            fromPlaceId = '';
            getterValue = {};
        }
        activeNested = null;
        mainPage.enablePage();
    });

    function changeKind(next: CollectorKind) {
        kind = next;
        if (next === 'entity') {
            collectIf = [];
        } else if (next === 'connectedPlaces') {
            fromPlaceId = '';
            getterValue = {};
        }
    }

    function openConditions() {
        activeNested = 'conditions';
        conditionsPage.enablePage();
    }

    function openGetter() {
        activeNested = 'getter';
        getterPage.enablePage();
    }

    function closeNested() {
        activeNested = null;
        mainPage.enablePage();
    }

    function cancelNested() {
        closeNested();
    }

    function submitCollector() {
        let result: CollectorToGet;
        if (kind === 'self') {
            result = { type: 'collector', target: 'self' };
        } else if (kind === 'connectedPlaces') {
            const source = typeof fromPlaceId === 'string' ? fromPlaceId.trim() : fromPlaceId;
            if (!source || (typeof source === 'string' && !source)) {
                showError('Add the source place id or configure a getter');
                return;
            }
            result = { type: 'collector', target: 'connectedPlaces', fromPlaceId: source as any };
        } else {
            result = { type: 'collector', target, collectIf } as CollectorToGet;
        }

        value = result;
        if (autoAttach && attachTo) autoAttach[attachTo] = result;
        onAfterSubmit?.(result);
    }

    function submitActive() {
        if (activeNested === 'conditions') {
            nestedSwitcher.getActiveSwitch()?.localData.form?.onSubmit?.();
            return;
        }
        if (activeNested === 'getter') {
            nestedFormProps.onSubmit?.();
            return;
        }
        submitCollector();
    }

    function cancelActive() {
        if (activeNested !== null) {
            cancelNested();
            return;
        }
        onCancel?.();
    }

    $effect(() => {
        if (writeFormPropsTo && (writeFormPropsTo.onSubmit !== submitActive || writeFormPropsTo.onCancel !== cancelActive)) {
            writeFormPropsTo = { ...writeFormPropsTo, onSubmit: submitActive, onCancel: cancelActive };
        }
    });
</script>

{#snippet inputs()}
    {#if activeNested === null}
        <InputSelect
            id="collector-type"
            label="Collector type:"
            wrapDiv
            selected={kind}
            onchange={(event) => changeKind((event.currentTarget as HTMLSelectElement).value as CollectorKind)}
            items={[
                { title: 'Entity collector', value: 'entity' },
                { title: 'Self', value: 'self' },
                { title: 'Connected places', value: 'connectedPlaces' }
            ]}
        />
        {#if kind === 'entity'}
            <InputSelect
                id="collector-target"
                label="Target:"
                wrapDiv
                bind:selected={target}
                items={[
                    { title: 'Character', value: 'character' },
                    { title: 'Place', value: 'place' },
                    { title: 'Item', value: 'item' }
                ]}
            />
            <div class="nested-section">
                <h3>Collect if</h3>
                <button type="button" class="nested-button" onclick={openConditions}>
                    Configure conditions ({collectIf.length})
                </button>
            </div>
        {:else if kind === 'connectedPlaces'}
            <InputSelect
                id="collector-source-kind"
                label="Source:"
                wrapDiv
                selected={typeof fromPlaceId === 'object' ? 'getter' : 'literal'}
                onchange={(event) => {
                    const sourceKind = (event.currentTarget as HTMLSelectElement).value;
                    if (sourceKind === 'getter') {
                        fromPlaceId = {};
                        getterValue = {};
                    } else {
                        fromPlaceId = '';
                        getterValue = {};
                    }
                }}
                items={[
                    { title: 'Place id', value: 'literal' },
                    { title: 'Getter', value: 'getter' }
                ]}
            />
            {#if typeof fromPlaceId === 'object'}
                <button type="button" class="nested-button" onclick={openGetter}>
                    {getterValue.type ? 'Edit source getter' : 'Configure source getter'}
                </button>
            {:else}
                <InputText id="collector-source-id" label="Source place id:" wrapDiv bind:value={fromPlaceId} autocomplete="off" />
            {/if}
        {/if}
    {:else if activeNested === 'conditions'}
        <ListConditions
            bind:values={collectIf}
            switcher={nestedSwitcher}
            onCancel={closeNested}
            onAfterSubmit={closeNested}
        />
    {:else if activeNested === 'getter'}
        <FormGetter
            bind:value={getterValue}
            bind:writeFormPropsTo={nestedFormProps}
            onCancel={closeNested}
            onAfterSubmit={(next) => {
                getterValue = next;
                fromPlaceId = next;
                closeNested();
            }}
        />
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
    .nested-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.5rem 0;
    }
    .nested-section h3 {
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
