import { showError } from "$lib/notify";
import type { GetterCtx } from "$lib/shared/getterCtx";
import { untrack } from "svelte";

export interface GetterDeclarator {
    type: 'getter';
    in: string;
    variable: string;
    fallback?: string | number | boolean;
}
export interface PropsFormGetter {
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
export const OBJECTS_OPTS = {
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
};
export const NO_TARGET_STRUCTURES = ['world','temp','self']
export const METADATA_OPTS = {
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
export function createGetterFormLogic(props:PropsFormGetter){
    // `props.value` is shared with the caller. Keep a snapshot of writes made
    // here so the synchronisation effect does not feed those writes back into
    // the form as if they had come from outside.
    let lastWrittenValue: string | undefined;
    function valueSnapshot(value = props.value){
        return value ? JSON.stringify($state.snapshot(value)) : undefined;
    }
    function updateValue(key:string, value:unknown){
        if(!props.value || typeof props.value !== 'object'){
            return;
        }
        props.value[key] = value;
        lastWrittenValue = valueSnapshot();
    }
    let allowedTypes = $derived.by(()=>{
        let allowedGetters = props.getterCtx?._getter.getAllowedGetters();
        const allEments = [
            {title:'Self',value:'self'},
            {title:'Target',value:'target'},
            {title:'Runtime',value:'runtime'},
            {title:'Temporary Slot',value:'temp'},
            {title:'World',value:'world'}
        ];
        const result = allowedGetters ? allowedGetters.map((getter) => allEments.find((a) => a.value === getter)!) : allEments;
        return result;
    })
    let _in = $state(untrack(()=> allowedTypes[0].value));
    let targetItems = $derived(setObjectOptions(_in === 'runtime' ? 'runtime' : 'general'));
    let getItems: { title: string; value: string }[] = $state([]);
    let metadataItems: { title: string; value: string }[] = $state([]);
    let _target = $state(untrack(()=> targetItems[0].value));
    let _get = $state('variable');
    let _variable = $state('');
    let _fallback = $state('');

    updateItemOps();
    updateMetadataOpts();

    function setObjectOptions(mode:'general'|'runtime'){
        return OBJECTS_OPTS[mode].filter((e)=>(props.getterCtx?._getter.getAllowedObjects() ?? []).includes(e.value as any));
    }
    function updateItemOps(){
        getItems =[];
        
        _target != 'action' && getItems.push({title:'Variable',value:'variable'});
        _in != 'temp' && getItems.push({title:'Metadata',value:'metadata'});

        if(getItems.length == 1){
            _get = getItems[0].value;
        }

    }
    function updateMetadataOpts(){
        metadataItems = [];
        
        if(_get != 'metadata'){
            return [];
        }
        const selfMetadata = props.getterCtx?._getter.getSelfMetadata();
        if(_in === 'self' && selfMetadata){
            metadataItems = METADATA_OPTS[selfMetadata];
        }
        if(_in === 'target' || _in === 'runtime'){
            metadataItems = METADATA_OPTS[_target as keyof typeof METADATA_OPTS] ?? [];
        }
        if(metadataItems.length == 0){
            metadataItems = METADATA_OPTS[_in as keyof typeof METADATA_OPTS] ?? [];
        }
        if(metadataItems.length && !metadataItems.find((e)=>e.value === _variable)){
            _variable = metadataItems[0].value;
        }
        
    }
    let main = {
        set data(value:Record<string,any>){
            if(value.variable){
                _variable = value.variable;
            }
            if(value.fallback){
                _fallback = value.fallback;
            }
            if(value.in){
                const fullIn = value.in;
                const [scope, source] = fullIn.split(':', 2);
                const isSelfGetter = scope === 'self-variable' || scope === 'self-metadata';
                const sourceParts = isSelfGetter ? [scope.slice('self-'.length)] : (source?.split('-') ?? []);
                _in = isSelfGetter ? 'self' : scope;
                _target = isSelfGetter ? 'character' : sourceParts[0];
                _get = isSelfGetter ? sourceParts[0] : sourceParts[1];
            }else{
                _in = value._in ?? _in;
                _target = value._target ?? _target;
                _get = value._get ?? _get;
            }
            updateItemOps();
            updateMetadataOpts();
        },
        get data(){
            return {
                type:'raw-getter',
                _in,
                _target,
                _get,
                variable:_variable,
                fallback:_fallback
            }
        },
        getPropsIn(){
            return {
                id:'getter-location',
                label:'In:',
                get selected(){
                    return _in;
                },
                set selected(value:string){
                    _in = value;
                    if(!_target || !targetItems.find((e)=>e.value === _target)){
                        _target = value == 'temp' ? 'any' :  targetItems[0].value;
                    }
                    updateValue('_in', value);
                    updateItemOps();
                    updateMetadataOpts();
                },
                items:allowedTypes,
                required:true
            }
        },
        getPropsTarget(){
            return {
                id:'getter-target',
                label:'Object:',
                get selected(){
                    return _target;
                },
                set selected(value:string){
                    if(value === 'action' && _get != 'metadata'){
                        _get = 'metadata';
                    }
                    _target = value;
                    updateValue('_target', value);
                    updateItemOps();
                    updateMetadataOpts();
                },
                get items(){
                    return targetItems;
                }
            }
        },
        getPropsSlot(){
            return {
                id:'getter-get',
                label:'Get:',
                get selected(){
                    return _get;
                },
                set selected(value:string){
                    _get = value;
                    updateValue('_get', value);
                    updateMetadataOpts();
                },
                items:getItems,
                get disabled(){
                    return getItems.length === 1;
                }
            }
        },
        getPropsVariable(){
            return {
                id:'getter-variable',
                label:'Variable:',
                get value(){
                    return _variable;
                },
                set value(value:string){
                    _variable = value;
                    updateValue('variable', value);
                },
                required:true,
            }
        },
        getPropsFallback(){
            return {
                id:'getter-fallback',
                label:'Fallback:',
                get value(){
                    return _fallback;
                },
                set value(value:string){
                    _fallback = value;
                    updateValue('fallback', value);
                }
            }
        },
        getPropsMetadata(){
            return {
                id:'getter-metadata',
                label:'Metadata:',
                get selected(){
                    return _variable;
                },
                set selected(value:string){
                    _variable = value;
                    updateValue('variable', value);
                },
                items:metadataItems
            }
        },
        /** Use it before `getPropsTarget`, to check if the selected getter needs a target */
        hasTarget(){
            return !NO_TARGET_STRUCTURES.includes(_in);
        },
        isVariable(){
            return _get === 'variable';
        },
        isMetadata(){
            return _get === 'metadata';
        },
        submit(){
            let inProperty = _in;
            _variable = _variable.trim();
            if(!_variable){
                showError('Add the variable to get the value');
                return;
            }
            if(_variable.match(/[,!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)){
                showError('Variable name cannot contain: spaces,commans, or special characters');
                return;
            }
            if(NO_TARGET_STRUCTURES.includes(_in)){
                inProperty += ['self','world'].includes(_in) ?  `-${_get}` : '-variable';
            }else{
                inProperty += `:${_target}-${_get}`
            }
            const finalData:GetterDeclarator = {
                type:'getter',
                in:inProperty,
                variable:_variable
            }
            if(_fallback){
                finalData.fallback = _fallback;
            }
            if(props.autoAttach && props.attachTo){
                props.autoAttach[props.attachTo] = finalData;
            }
            props.onAfterSubmit?.(finalData);
            return finalData;
        }
    }
    if(props.value){
        main.data = props.value;
        lastWrittenValue = valueSnapshot();
    }
    $effect(()=>{
        if(props.writeFormPropsTo && props.writeFormPropsTo.onSubmit !== main.submit){
            props.writeFormPropsTo = {...props.writeFormPropsTo,onSubmit:main.submit,onCancel:props.onCancel};
        }
    });
    $effect(()=>{
        const nextValue = valueSnapshot();
        if(nextValue === lastWrittenValue){
            return;
        }
        if(props.value){
            main.data = props.value;
        }
        lastWrittenValue = nextValue;
    });
    return main;
}
