<script lang="ts">
    import { tick } from 'svelte';
    import ContextHost from '$lib/components/ContextHost.svelte';
    import type { CollectorToGet } from '$lib/types/data/declarative';
    import { createContextStack } from '$lib/shared/contextStack.svelte';
    import ListCollectors from '../ListCollectors.svelte';

    const stack = createContextStack();
    let mounted = $state(true);
    let values = $state<CollectorToGet[]>([
        { type: 'collector', target: 'place', collectIf: [] }
    ]);

    async function remountCollectorEditor() {
        mounted = false;
        await tick();
        mounted = true;
    }
</script>

{#if mounted}
    <ListCollectors bind:values={values} {stack}/>
{/if}

<ContextHost {stack} />

<button type="button" onclick={remountCollectorEditor}>Remount collector editor</button>
<output data-testid="collector-count">{values.length}</output>
<output data-testid="condition-count">
    {values[0] && 'collectIf' in values[0] ? values[0].collectIf?.length ?? 0 : 0}
</output>
