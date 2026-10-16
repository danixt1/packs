<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import type { EffectFomAction } from "$lib/types/data/declarative";
    import FormEffect from "../forms/FormEffect.svelte";
    import OrderedList from "./OrderedList.svelte";

    interface Props {
        values?: EffectFomAction[];
        stack?: ContextStack;
        onEdit?: (value: EffectFomAction, index: number) => void;
        onCancel?: () => void;
        onAfterSubmit?: (value: EffectFomAction) => void;
        onCreatePressed?: () => void;
    }

    let {
        values = $bindable<EffectFomAction[]>([]),
        stack,
        onEdit,
        onCancel,
        onAfterSubmit,
        onCreatePressed
    }: Props = $props();

    let items = $state<EffectFomAction[]>([]);

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
        } else {
            onCancel?.();
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
        } else {
            onCancel?.();
        }
    }

    function addEffect() {
        if (stack) {
            handleStackCreate();
            return;
        }
        onCreatePressed?.();
    }

    function editEffect(effect: EffectFomAction, index: number) {
        if (stack) {
            handleStackEdit(effect, index);
            return;
        }
        onEdit?.(effect, index);
    }

    function deleteEffect(_: EffectFomAction, index: number) {
        setItems(items.filter((__, itemIndex) => itemIndex !== index));
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

<div class="effect-list form-group">
    <OrderedList
        bind:values={items}
        getLabel={label}
        onEdit={stack || onEdit ? editEffect : undefined}
        onDelete={deleteEffect}
        emptyText="No effects yet. Add an effect to start."
    />
    <button type="button" class="add-button" onclick={addEffect}>Add Effect</button>
</div>

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