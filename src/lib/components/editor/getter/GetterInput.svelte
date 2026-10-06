<script lang="ts" generics="FormId extends string">
    import {InputSelect,InputText} from "$lib/components/inputs";
    import InputSwitch from "$lib/components/inputs/InputSwitch.svelte";
    import { showError } from "$lib/notify";
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";

    interface Props<FormId extends string>{
        formFlow:"getter" extends FormId ? FormPopupFlow<FormId> : never;
        parentFormId?:string;
        /**
         * When enabled the user can choose to return a literal value
         * (string, number or boolean) instead of a getter.
         * The literal is written directly to the parent property.
         */
        enableSupportToLiterals?:boolean;
    }
    let {formFlow,parentFormId = formFlow.initialForm,enableSupportToLiterals = false}:Props<FormId> = $props();
    let data = $derived(formFlow.data);
    let supportLiterals = $derived(enableSupportToLiterals || Boolean(data._enableLiterals));
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
    function coerceLiteral(type: string | undefined, value: unknown): string | number | boolean | undefined {
        if (type === 'number') {
            const parsed = Number(value);
            return value === '' || value === null || value === undefined || Number.isNaN(parsed) ? undefined : parsed;
        }
        if (type === 'boolean') return value === true || value === 'true';
        return value === undefined || value === null ? undefined : String(value);
    }
    $effect(()=>{
        if(data.in){
            const fullIn = data.in;
            const [inProperty, targetGet] = fullIn.split(':');
            data._in = inProperty;
            if(targetGet){
                const [target, get] = targetGet.split('-');
                data._target = target;
                data._get = get;
            }
            delete data.in;
            return;
        }
        if(data._literalValue !== undefined && data._literalType === undefined){
            
            if(!supportLiterals){
                throw new Error('Literal value is set but support for literals is disabled');
            }
            data._mode = 'literal';
            if(typeof data._literalValue === 'string')data._literalType = 'string';
            else if(typeof data._literalValue === 'number')data._literalType = 'number';
            else if(typeof data._literalValue === 'boolean')data._literalType = 'boolean';
            return;
        }
        if (supportLiterals && data._mode === undefined) {
            data._mode = 'getter';
            data._literalType = 'string';
            data._literalValue = '';
        }
        if(data._in === 'runtime'){
            objectsOptions = OBJECTS_OPTS.runtime;
            if(OBJECTS_OPTS.runtime.find(o=>o.value === data._target) === undefined){
                data._target = OBJECTS_OPTS.runtime[0].value;
            }
        }else{
            objectsOptions = OBJECTS_OPTS.general;
            if(OBJECTS_OPTS.general.find(o=>o.value === data._target) === undefined){
                data._target = OBJECTS_OPTS.general[0].value;
            }
        }
        if(data._in ==='temp'){
            data._get = 'variable';
        }
    });
    (()=>{
        formFlow.setFormDefinition('getter' as FormId,{
            title: (e)=>'Get Something',
            onSubmit(form) {
                const parent = form.getDataFromPanel(form.data._parent || parentFormId);
                if(!parent){
                    console.error('Passed form was not found!');
                    showError('Internal: Invalid parent form');
                    return 'back';
                }
                const addTo = parent._getter;
                if(!addTo){
                    console.error('Expected property _getter in the parent form');
                    showError('Internal: not added _getter');
                    return 'back'
                }
                if(form.data._mode === 'literal'){
                    const literal = coerceLiteral(form.data._literalType, form.data._literalValue);
                    if(literal === undefined){
                        showError('Add a valid literal value');
                        return 'stay';
                    }
                    parent[addTo] = literal;
                    delete parent._getter;
                    return 'back';
                }
                let inProperty = form.data._in;
                if(inProperty != 'temp'){
                    inProperty +=`:${form.data._target}-${form.data._get}`
                }else{
                    inProperty +=':variable';
                }
                if(!form.data.variable){
                    showError('Add the variable to get the value');
                    return 'stay'
                }
                const getter = {
                    type:'getter',
                    in:inProperty,
                    variable:form.data.variable,
                    fallback:form.data.fallback
                }
                parent[addTo] = getter;
                delete parent._getter;
                return 'back';
            },
        });
    })();
</script>
{#if supportLiterals}
    <InputSelect id={'getter-mode'} label={'Return:'} wrapDiv bind:selected={data._mode}
    items={[
        {title:'Getter',value:'getter'},
        {title:'Literal value',value:'literal'}
    ]} />
{/if}
{#if !supportLiterals || data._mode === 'getter'}
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
        <InputText id={'getter-variable'} label={'Variable:'} wrapDiv bind:value={data.variable} autocomplete='off'/>
    {:else if data._get === 'metadata'}
        <InputSelect id={'getter-metadata'} label={'Metadata:'} wrapDiv bind:selected={data.variable}
        items={metadataOptions}/>
    {/if}
    <InputText id={'getter-fallback'} label={'Fallback value:'} wrapDiv bind:value={data.fallback} autocomplete='off'/>
{:else}
    <InputSelect id={'getter-literal-type'} label={'Type:'} wrapDiv bind:selected={data._literalType}
    items={[
        {title:'String',value:'string'},
        {title:'Number',value:'number'},
        {title:'Boolean',value:'boolean'}
    ]} />
    {#if data._literalType === 'boolean'}
        <InputSwitch id={'getter-literal-value'} label={'Value:'} wrapDiv bind:value={data._literalValue} />
    {:else}
        <InputText id={'getter-literal-value'} label={'Value:'} wrapDiv bind:value={data._literalValue} autocomplete='off'/>
    {/if}
{/if}
<style>
    .base-data{
        display: flex;
        flex-direction: row;
    }
</style>