<script lang="ts">
    import {InputSelect,InputText} from "$lib/components/inputs";
    import { showError } from "$lib/notify";
    import type { GetterCtx } from "$lib/shared/getterCtx";
    import Form from "../Form.svelte";
    import CopyPasteData from "./CopyPasteData.svelte";

    interface GetterDeclarator {
        type: 'getter';
        in: string;
        variable: string;
        fallback?: string | number | boolean;
    }

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data: GetterDeclarator) => void;
        value?: Record<string,any>;
        /** Object that receives the generated getter when `attachTo` is provided. */
        autoAttach?: Record<string, any>;
        /** Property in `autoAttach` that receives the generated getter. */
        attachTo?: string;
        writeFormPropsTo?:Record<string,any>;
        /** Object with auxiliar hint system to the get*/
        getterCtx?:GetterCtx
    }
    let { onCancel, onAfterSubmit, value = $bindable(),
        autoAttach = $bindable(), attachTo, writeFormPropsTo = $bindable(),getterCtx }: Props = $props();
    let data = $state<Record<string, any>>({});
    const OBJECTS_OPTS = {
        general:[
            {title:'Character',value:'character'},
            {title:'Character > Place',value:'character/place'},
            {title:'Place',value:'place'},
            {title:'Item',value:'item'}
        ],
        runtime:[
            {title:'Event',value:'event'},
            {title:'Action',value:'action'},
            {title:'Autonomy',value:'autonomy'}
        ]
    }
    let allowedTypes = $derived.by(()=>{
        let allowedGetters = getterCtx?._getter.getAllowedGetters();
        const allEments = [
            {title:'Self',value:'self'},
            {title:'Target',value:'target'},
            {title:'Runtime',value:'runtime'},
            {title:'Temporary Slot',value:'temp'},
            {title:'World',value:'world'}
        ];
        return allEments.filter((a)=> allowedGetters ? allowedGetters.includes(a.value as any) : true );
    })
    const NO_TARGET_STRUCTURES = ['world','temp','self']
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
            {title:'Action Name',value:'actionName'},
            {title:'Execution Time',value:'executionTime'},
            {title:'Is From Player',value:'isFromPlayer'}
        ],
        autonomy:[
            {title:'Current Goal',value:'currentGoal'},
            {title:'Last Action Name',value:'lastActionName'},
            {title:'Cycle',value:'cycle'}
        ],
        world:[
            {title:'Time',value:'time'}
        ]
    }
    let metadataOptions = $derived(
        METADATA_OPTS[data._target as keyof typeof METADATA_OPTS]
            ?? (data._in in METADATA_OPTS ? METADATA_OPTS[data._in as 'world'] : [])
    );
    let objectsOptions = $state(setObjectOptions('general'));
    function setObjectOptions(mode:'general'|'runtime'){
        return OBJECTS_OPTS[mode].filter((e)=>(getterCtx?._getter.getAllowedObjects() ?? []).includes(e.value as any));
    }
    $effect(()=>{
        if(!writeFormPropsTo){
            return;
        }
        if(writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancel){
            writeFormPropsTo = {...writeFormPropsTo,onSubmit,onCancel};
        }
    })
    $effect(()=>{
        if(getterCtx){
            let categories =(getterCtx._getter.getActionCategories() ?? []).map(e =>({
                title:'Has Category '+e,value:'hasCategory:'+e
            }));
            METADATA_OPTS.action = [...METADATA_OPTS.action,...categories];
        }
    })
    $effect(()=>{
        if(!value){
            data = {_in:'self',_get:'variable'};
            return;
        }
        if(value.type === 'getter'){
            const [scope, source] = value.in.split(':', 2);
            const isSelfGetter = scope === 'self-variable' || scope === 'self-metadata';
            const sourceParts = isSelfGetter ? [scope.slice('self-'.length)] : (source?.split('-') ?? []);
            data = {
                _in: isSelfGetter ? 'self' : scope,
                _target: isSelfGetter ? 'character' : sourceParts[0],
                _get: isSelfGetter ? sourceParts[0] : sourceParts[1],
                variable: value.variable,
                fallback: value.fallback
            };
        }
    });
    $effect(()=>{
        if(data.in){
            const fullIn = data.in;
            const [scope, source] = fullIn.split(':', 2);
            const isSelfGetter = scope === 'self-variable' || scope === 'self-metadata';
            const sourceParts = isSelfGetter ? [scope.slice('self-'.length)] : (source?.split('-') ?? []);
            data._in = isSelfGetter ? 'self' : scope;
            data._target = isSelfGetter ? 'character' : sourceParts[0];
            data._get = isSelfGetter ? sourceParts[0] : sourceParts[1];
            delete data.in;
            return;
        }
        if(data._in === 'runtime'){
            const runtime = setObjectOptions('runtime');
            objectsOptions =runtime;
            if(runtime.find(o=>o.value === data._target) === undefined){
                data._target = runtime[0].value;
            }
        }
        if(data._in === 'target'){
            const general = setObjectOptions('general');
            objectsOptions = general;
            if(general.find(o=>o.value === data._target) === undefined){
                data._target = general[0].value;
            }
        }
        if(data._in === 'world'){
            data._target = '';
            return
        }
        if(data._in === 'self'){
            data._target = getterCtx?._getter.getAllowedObjects()[0] ?? 'character';
        }
        if(data._in ==='temp'){
            data._get = 'variable';
        }
    });
    function onSubmit(){
        let inProperty = data._in;
        if(!inProperty){
            showError('Select where to get the value');
            return;
        }
        if(NO_TARGET_STRUCTURES.includes(inProperty)){
            inProperty += ['self','world'].includes(inProperty) ? `-${data._get}` : '-variable';
        }else{
            inProperty += `:${data._target}-${data._get}`;
        }
        
        if(!data.variable){
            showError('Add the variable to get the value');
            return;
        }

        const finalData: GetterDeclarator = {
            type: 'getter',
            in: inProperty,
            variable: data.variable,
        };
        if(['string', 'number', 'boolean'].includes(typeof data.fallback) && data.fallback !== ''){
            finalData.fallback = data.fallback;
        }
        value = finalData;
        if(autoAttach && attachTo){
            autoAttach[attachTo] = finalData;
        }
        onAfterSubmit?.(finalData);
    }
</script>
{#snippet inputs()}
    <CopyPasteData onCopy = {()=>data} onPaste={(e)=>data = e} name='Getter'/>
    <div class="form-group base-data">
        <InputSelect id={'getter-location'} label={'In:'} bind:selected={data._in}
        items={allowedTypes} />
        {#if !NO_TARGET_STRUCTURES.includes(data._in)}
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
        <InputText id={'getter-variable'} label={'Variable:'} wrapDiv bind:value={data.variable} autocomplete='off' suggestions={getterCtx?._getter.getVars(data._target) ?? []}/>
    {:else if data._get === 'metadata'}
        <InputSelect id={'getter-metadata'} label={'Metadata:'} wrapDiv bind:selected={data.variable}
        items={metadataOptions}/>
    {/if}
    <InputText id={'getter-fallback'} label={'Fallback value:'} wrapDiv bind:value={data.fallback} autocomplete='off'/>
{/snippet}
{#if writeFormPropsTo}
    {@render inputs()}
{:else}
    <Form onSubmit={onSubmit} onCancel={onCancel}>
        {@render inputs()}
    </Form>
{/if}
<style>
    .base-data{
        display: flex;
        flex-direction: row;
    }
</style>
