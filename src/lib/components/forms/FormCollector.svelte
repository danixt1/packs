<script lang="ts">
    import type { ContextFrame, ContextStack } from "$lib/shared/contextStack.svelte";
    import { showError } from "$lib/notify";
    import type { CollectorToGet } from "$lib/types/data/declarative";
    import Form from "../Form.svelte";
    import { InputSelect, InputText } from "../inputs";
    import FormGetter from "./FormGetter.svelte";
    import ListConditions from "../lists/ListConditions.svelte";

    type CollectorKind = 'character'|'place'| 'item' | 'self' | 'connectedPlaces';
    const ENTS = ['character','place','item'];
    interface Props {
        value?: CollectorToGet;
        stack: ContextStack;
        onCancel?: () => void;
        onAfterSubmit?: (value: CollectorToGet) => void;
        autoAttach?: Record<string, any>;
        attachTo?: string;
        writeFormPropsTo?: Record<string, any>;
    }

    let {
        value = $bindable<CollectorToGet>(),
        stack,
        onCancel,
        onAfterSubmit
    }: Props = $props();
    let collectIf = $state<any[]>([]);

    let fromPlaceId = $state<string | Record<string, any>>('');
    let fromGetterPlace = $state<Record<string, any>>({});

    $effect(() => {
        if (!value) return;
        const incoming = $state.snapshot(value) as any;
        if (incoming.target === 'self') {
            collectIf = [];
            fromPlaceId = '';
            fromGetterPlace = {};
        } else if (incoming.target === 'connectedPlaces') {
            collectIf = [];
            fromPlaceId = typeof incoming.fromPlaceId === 'object' ? incoming.fromPlaceId : (incoming.fromPlaceId ?? '');
            fromGetterPlace = typeof incoming.fromPlaceId === 'object' ? incoming.fromPlaceId : {};
        } else {
            collectIf = [...(incoming.collectIf ?? [])];
            fromPlaceId = '';
            fromGetterPlace = {};
        }
    });

    function updateTargetDependency(next: CollectorKind) {
        if (ENTS.includes(next)) {
            collectIf = [];
        } else if (next === 'connectedPlaces') {
            fromPlaceId = '';
            fromGetterPlace = {};
        }
    }

    async function handleStackGetter() {
        const result = await stack.push<any, any>({
            title: 'Configure Source Getter',
            data: typeof fromPlaceId === 'object' ? fromPlaceId : {},
            render: renderGetterPlaceForm
        });
        if (result) {
            fromPlaceId = result;
            fromGetterPlace = result;
        }
    }

    function submitCollector() {
        let result: CollectorToGet;
        if (value.target === 'self') {
            result = { type: 'collector', target: 'self' };
        } else if (value.target === 'connectedPlaces') {
            const source = typeof fromPlaceId === 'string' ? fromPlaceId.trim() : fromPlaceId;
            if (!source || (typeof source === 'string' && !source)) {
                showError('Add the source place id or configure a getter');
                return;
            }
            result = { type: 'collector', target: 'connectedPlaces', fromPlaceId: source as any };
        } else {
            result = { type: 'collector', target:value.target, collectIf } as CollectorToGet;
        }

        value = result;
        onAfterSubmit?.(result);
    }

    function cancelActive() {
        onCancel?.();
    }
</script>

{#snippet renderGetterPlaceForm(frame: ContextFrame)}
    <FormGetter
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(val) => frame.resolve(val)}
    />
{/snippet}

{#snippet inputs()}
    <InputSelect
        id="collector-target"
        label="Target:"
        wrapDiv
        bind:selected={value.target}
        onchange={()=>updateTargetDependency(value.target)}
        items={[
            { title: 'Self', value: 'self'},
            { title: 'Character', value: 'character' },
            { title: 'Place', value: 'place' },
            { title: 'Item', value: 'item' },
            { title: 'Connect Places', value:'connectedPlaces'}
        ]}
    />
    {#if ['character','place','item'].includes(value.target)}
        <div class="nested-section">
            <h3>Collect if</h3>
            <ListConditions
                bind:values={collectIf}
                {stack}
            />
        </div>
    {:else if value.target === 'connectedPlaces'}
        <InputSelect
            id="collector-source-kind"
            label="Source:"
            wrapDiv
            selected={typeof fromPlaceId === 'object' ? 'getter' : 'literal'}
            onchange={(event) => {
                const sourceKind = (event.currentTarget as HTMLSelectElement).value;
                if (sourceKind === 'getter') {
                    fromPlaceId = {};
                    fromGetterPlace = {};
                } else {
                    fromPlaceId = '';
                    fromGetterPlace = {};
                }
            }}
            items={[
                { title: 'Place id', value: 'literal' },
                { title: 'Getter', value: 'getter' }
            ]}
        />
        {#if typeof fromPlaceId === 'object'}
            <button type="button" class="nested-button" onclick={handleStackGetter}>
                {fromGetterPlace.type ? 'Edit source getter' : 'Configure source getter'}
            </button>
        {:else}
            <InputText id="collector-source-id" label="Source place id:" wrapDiv bind:value={fromPlaceId} autocomplete="off" />
        {/if}
    {/if}
{/snippet}

<Form onSubmit={submitCollector} onCancel={cancelActive}>
    {@render inputs()}
</Form>

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
