<script lang="ts">
    import ContextHost from '$lib/components/ContextHost.svelte';
    import { createContextStack } from '$lib/shared/contextStack.svelte';
    import type { CollectorToGet } from '$lib/types/data/declarative';
    import FormCollector from '../FormCollector.svelte';

    const stack = createContextStack();
    let value = $state<CollectorToGet>({ type: 'collector', target: 'character', collectIf: [] });

    async function openCollector() {
        const result = await stack.push<CollectorToGet, CollectorToGet>({
            title: 'Edit Collector',
            data: value,
            render: renderCollector
        });
        if (result) value = result;
    }
</script>

{#snippet renderCollector(frame: any)}
    <FormCollector
        bind:value={frame.draft}
        {stack}
        onCancel={() => frame.cancel()}
        onAfterSubmit={(collector) => frame.resolve(collector)}
    />
{/snippet}

<button type="button" onclick={openCollector}>Open collector</button>
<ContextHost {stack} />
