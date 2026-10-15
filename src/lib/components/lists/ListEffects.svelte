<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { PageSwitch, Switch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import type { EffectFomAction } from "$lib/types/data/declarative";
    import FormEffect from "../forms/FormEffect.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: EffectFomAction[];
        stack?: ContextStack;
        switcher?: PageSwitch;
        page?: Switch;
        /** Non-serialized identity used when several effect lists share a PageSwitch. */
        scope?: string;
        onEdit?: (value: EffectFomAction, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: EffectFomAction) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<EffectFomAction[]>([]),
        stack,
        switcher = $bindable(),
        page,
        scope,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    const FORM_DATA_KEY = 'effectFormData';
    const EDITING_KEY = 'effectEditing';

    let formData = $state<EffectFomAction | undefined>();
    let editing = $state<number | null>(null);
    let pageSwitcher = $state<Switch | null>(null);
    let items = $state<EffectFomAction[]>([]);
    let ownsPageSwitcher = $state(false);

    $effect(() => {
        if (!pageSwitcher && page) {
            pageSwitcher = page;
            ownsPageSwitcher = false;
            formData = page.localData[FORM_DATA_KEY] as EffectFomAction | undefined;
            editing = page.localData[EDITING_KEY] ?? null;
            return;
        }
        if (!pageSwitcher && switcher) {
            pageSwitcher = switcher.createSwitch({
                in:{type:'list',name:'effect', scope}, form:{}
            }, scope);
            ownsPageSwitcher = true;
        }
    });

    onDestroy(() => {
        if (ownsPageSwitcher) {
            pageSwitcher?.remove();
        }
    });

    $effect(() => {
        const incoming = values ?? [];
        if (JSON.stringify($state.snapshot(items)) === JSON.stringify(incoming)) {
            return;
        }
        items = incoming;
    });

    function setItems(next: EffectFomAction[]) {
        items = next;
        values = next;
    }

    async function handleStackCreate() {
        if (!stack) return;
        const result = await stack.push<EffectFomAction, EffectFomAction>({
            title: 'Add Effect',
            data: { type: 'event', event: '' },
            render: renderEffectForm
        });
        if (result) {
            setItems([...items, result]);
            onAfterSubmit?.(result);
        }
    }

    async function handleStackEdit(effect: EffectFomAction, index: number) {
        if (!stack) return;
        const result = await stack.push<EffectFomAction, EffectFomAction>({
            title: `Edit Effect (${label(effect)})`,
            data: $state.snapshot(effect),
            render: renderEffectForm
        });
        if (result) {
            const next = [...items];
            next[index] = result;
            setItems(next);
            onAfterSubmit?.(result);
        }
    }

    function addEffect() {
        if (stack) {
            handleStackCreate();
            return;
        }
        if (pageSwitcher) {
            const nextFormData: EffectFomAction = { type: 'event', event: '' };
            pageSwitcher.localData[FORM_DATA_KEY] = nextFormData;
            pageSwitcher.localData[EDITING_KEY] = null;
            editing = null;
            formData = nextFormData;
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function editEffect(effect: EffectFomAction, index: number) {
        if (stack) {
            handleStackEdit(effect, index);
            return;
        }
        if (pageSwitcher) {
            const nextFormData = $state.snapshot(effect);
            pageSwitcher.localData[FORM_DATA_KEY] = nextFormData;
            pageSwitcher.localData[EDITING_KEY] = index;
            editing = index;
            formData = nextFormData;
            pageSwitcher.enablePage();
            return;
        }
        onEdit?.(effect, index);
    }

    function deleteEffect(effect: EffectFomAction, index: number){
        items.splice(index,1);
        values.splice(index,1);
    }

    function label(effect: EffectFomAction): string {
        switch (effect.type) {
            case 'move':
                return 'Move character';
            case 'event':
                return `Event: ${effect.event || '(unnamed)'}`;
            case 'conditional':
                return `Conditional (${effect.onTrue.length} true / ${effect.onFalse?.length ?? 0} false effects)`;
            case 'setter':
                return `Set variable (${effect.mode}) in ${effect.var.in}:${effect.var.variable}`;
            case 'start-dialogue':
                return `Start dialogue: ${effect.dialogueId ?? effect.intent ?? '(unspecified)'}`;
        }
    }
</script>

{#snippet renderEffectForm(frame: any)}
    <FormEffect
        {stack}
        bind:value={frame.draft}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(effect) => frame.resolve(effect)}
    />
{/snippet}

{#if pageSwitcher && pageSwitcher.isPageEnabled}
    <FormEffect
        bind:value={formData}
        bind:writeFormPropsTo={pageSwitcher.localData.form}
        onCancel={() => {
            editing = null;
            onCancel?.();
        }}
        onAfterSubmit={(effect) => {
            const next = [...items];
            if (editing === null) next.push(effect);
            else next[editing] = effect;
            setItems(next);
            editing = null;
            onAfterSubmit?.(effect);
        }}
    />
{:else}
    <div class="effect-list form-group">
        <OrderedList
            bind:values={items}
            getLabel={label}
            onEdit={editEffect}
            onDelete={deleteEffect}
            emptyText="No effects yet. Add an effect to start."
        />
        <button type="button" class="add-button" onclick={addEffect}>Add Effect</button>
    </div>
{/if}

<style>
    .effect-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .add-button {
        align-self: flex-start;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.6rem;
        cursor: pointer;
    }
    .add-button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>