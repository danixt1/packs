<script lang="ts">
    import {InputSelect,InputText} from "$lib/components/inputs";
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";

    interface Props{
        formFlow:FormPopupFlow<any>
    }
    let {formFlow}:Props = $props();
    let data = $derived(formFlow.data);
    const OBJECTS_OPTS = {
        general:[
            {title:'Character',value:'character'},
            {title:'Character > Place',value:'character/place'},
            {title:'Place',value:'place'},
            {title:'Item',value:'item'},
            {title:'Autonomy',value:'autonomy'}
        ],
        runtime:[
            {title:'Event',value:'event'},
            {title:'Action',value:'action'}
        ]
    }
    const METADATA_OPTS = {
        character:[
            {title:'Id Place',value:'idPlace'},
            {title:'Is Player?',value:'isPlayer'},
            {title:'Is Observed?',value:'isObserved'},
            {title:'Name',value:'name'},
            {title:'Id',value:'id'}
        ],
        'character/place':[
            {title:'Name',value:'name'},
            {title:'Description',value:'description'},
            {title:'Id',value:'id'}
        ],
        place:[
            {title:'Name',value:'name'},
            {title:'Description',value:'description'},
            {title:'Id',value:'id'}
        ],
        item:[
            {title:'Name',value:'name'},
            {title:'Description',value:'description'},
            {title:'Id',value:'id'}
        ],
        event:[
            {title:'Event',value:'event'},
            {title:'Actor Id',value:'actorId'},
            {title:'Target Id',value:'targetId'},
            {title:'Place Id',value:'placeId'}
        ],
        action:[
            // TODO: need to make the has category options
            {title:'Has Category',value:'hasCategory:'},
            {title:'Action Name',value:'actionName'},
            {title:'Execution Time',value:'executionTime'},
            {title:'Is From Player',value:'isFromPlayer'}
        ],
        autonomy:[
            {title:'Current Goal',value:'currentGoal'},
            {title:'Last Action Name',value:'lastActionName'},
            {title:'Cycle',value:'cycle'}
        ]
    }
    let metadataOptions = $derived(METADATA_OPTS[data._target as keyof typeof METADATA_OPTS] ?? []);
    let objectsOptions = $state(OBJECTS_OPTS.general);
    $effect(()=>{
        if(data._in === 'runtime'){
            objectsOptions = OBJECTS_OPTS.runtime;
            data._target = OBJECTS_OPTS.runtime[0].value;
        }else{
            objectsOptions = OBJECTS_OPTS.general;
            data._target = OBJECTS_OPTS.general[0].value;
        }
        if(data._in ==='temp'){
            data._get = 'variable';
        }
        if(data._get === 'variable'){
            data.variable = '';
        }
    })
</script>
<div class="form-group base-data">
    <InputSelect id={'getter-location'} label={'In:'} bind:selected={data._in}
    items={[
        {title:'Target',value:'target'},
        {title:'Runtime',value:'runtime'},
        {title:'Temporary Slot',value:'temp'}
    ]} />
    {#if data._in != 'temp'}
        <InputSelect id={'getter-target'} label={'Object:'} bind:selected={data._target}
        items={objectsOptions}/>
    {/if}
    {#if data._in != 'temp'}
        <InputSelect id={'getter-get'} label={'Get:'} bind:selected={data._get}
        items={[
            {title:'Variable',value:'variable'},
            {title:'Metadata',value:'metadata'}
        ]}/>
    {:else}
        <InputSelect id={'getter-get'} label={'Get:'} disabled bind:selected={data._get} 
        items={[
            {title:'Variable',value:'variable'}
        ]}/>
    {/if}
</div>
{#if data._get === 'variable'}
    <InputText id={'getter-variable'} label={'Variable:'} wrapDiv bind:value={data.variable}/>
{:else if data._get === 'metadata'}
    <InputSelect id={'getter-metadata'} label={'Metadata:'} wrapDiv bind:selected={data.variable}
    items={metadataOptions}/>
{/if}
<style>
    .base-data{
        display: flex;
        flex-direction: row;
    }
</style>