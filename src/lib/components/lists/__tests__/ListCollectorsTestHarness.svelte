<script lang="ts">
    import { tick } from 'svelte';
    import Form from '$lib/components/Form.svelte';
    import type { CollectorToGet } from '$lib/types/data/declarative';
    import { createPageSwitch } from '$lib/shared/pageSwitch';
    import ListCollectors from '../ListCollectors.svelte';

    const switcher = $state(createPageSwitch());
    const actionPage = switcher.createSwitch({ form: {} }, 'action');
    const targetsPage = switcher.createSwitch({ form: {} }, 'targets');
    let mounted = $state(true);
    let values = $state<CollectorToGet[]>([
        { type: 'collector', target: 'place', collectIf: [] }
    ]);

    function activeFormProps() {
        return switcher.getActiveSwitch()?.localData.form ?? {};
    }

    function submitActive() {
        activeFormProps().onSubmit?.();
    }

    function returnToAction() {
        actionPage.enablePage();
    }

    async function remountCollectorEditor() {
        mounted = false;
        await tick();
        mounted = true;
    }
</script>

<Form onSubmit={activeFormProps().onSubmit ?? submitActive} onCancel={activeFormProps().onCancel ?? returnToAction}>
    {#if mounted && (switcher.getActiveSwitch() === actionPage || switcher.getActiveSwitch() === targetsPage)}
        <ListCollectors
            bind:values={values}
            switcher={switcher}
            page={targetsPage}
            onCancel={returnToAction}
            onAfterSubmit={returnToAction}
        />
    {/if}
</Form>

<button type="button" onclick={remountCollectorEditor}>Remount collector editor</button>
<output data-testid="collector-count">{values.length}</output>
<output data-testid="condition-count">
    {values[0] && 'collectIf' in values[0] ? values[0].collectIf?.length ?? 0 : 0}
</output>
