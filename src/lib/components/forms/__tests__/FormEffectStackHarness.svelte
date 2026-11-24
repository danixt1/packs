<script lang="ts">
    import ContextHost from '$lib/components/ContextHost.svelte';
    import { createContextStack, type ContextFrame } from '$lib/shared/contextStack.svelte';
    import type { EffectFomAction } from '$lib/types/data/declarative';
    import type { CtxBuilder } from '$lib/shared/getterCtx';
    import FormEffect from '../FormEffect.svelte';

    interface Props {
        onAfterSubmit?: (effect: EffectFomAction) => void;
        initialValue?: EffectFomAction;
        ctx?: CtxBuilder;
    }

    let { onAfterSubmit, initialValue, ctx }: Props = $props();
    const stack = createContextStack();
    let value = $state<EffectFomAction>({ type: 'event', event: '' });

    $effect(() => {
        if (initialValue) value = initialValue;
    });

    async function openEffect() {
        const effect = await stack.push<EffectFomAction, EffectFomAction>({
            title: 'Edit Effect',
            data: value,
            render: renderEffect
        });
        if (effect) value = effect;
    }
</script>

{#snippet renderEffect(frame: ContextFrame<EffectFomAction, EffectFomAction>)}
    <FormEffect
        bind:value={frame.draft}
        {stack}
        {ctx}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(effect) => {
            onAfterSubmit?.(effect);
            frame.resolve(effect);
        }}
    />
{/snippet}

<button type="button" onclick={openEffect}>Open effect</button>
<ContextHost {stack} />
