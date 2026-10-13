<script lang="ts">
    import type { PageSwitch } from "$lib/shared/pageSwitch";
    import { onDestroy } from "svelte";
    import type { EffectFomAction } from "$lib/types/data/declarative";
    import FormEffect from "../forms/FormEffect.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: EffectFomAction[];
        switcher?: PageSwitch;
        onEdit?: (value: EffectFomAction, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: EffectFomAction) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<EffectFomAction[]>(),
        switcher = $bindable(),
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    let formData = $state<EffectFomAction | undefined>();
    let editing = $state<number | null>(null);
    let pageSwitcher = $state(switcher ? switcher.createSwitch({
        in:{type:'list',name:'effect'}, form:{}
    }) : null);
    let items = $state<EffectFomAction[]>([]);

    onDestroy(() => {
        pageSwitcher?.remove();
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

    function addEffect() {
        if (pageSwitcher) {
            editing = null;
            formData = { type: 'event', event: '' };
            pageSwitcher.enablePage();
            return;
        }
        onCreatePressed?.();
    }

    function editEffect(effect: EffectFomAction, index: number) {
        if (pageSwitcher) {
            editing = index;
            formData = $state.snapshot(effect);
            pageSwitcher.enablePage();
            return;
        }
        onEdit?.(effect, index);
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
            if (editing === null) {
                next.push(effect);
            } else {
                next[editing] = effect;
            }
            setItems(next);
            editing = null;
            onAfterSubmit?.(effect);
        }}
    />
{:else}
    <div class="effect-list">
        <OrderedList
            bind:values={items}
            getLabel={label}
            onEdit={editEffect}
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