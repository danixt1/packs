<script lang="ts" generics="FormId extends string">
    import InputSelect from "$lib/components/inputs/InputSelect.svelte";
    import { showError } from "$lib/notify";
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";
    import type { ConditionalList } from "$lib/types/data/declarative";
    import { describeOperand } from "$lib/shared/conditionalList";
    import ButtonPopUp from "../ButtonPopUp.svelte";

    interface Props<FormId extends string> {
        /**
         * It's necessary to Configure a GetterInput to the ConditionInput, so the formFlow must be passed to the GetterInput as well.
         */
        formFlow:"condition"|"getter" extends FormId ? FormPopupFlow<FormId> : never;
        parentFormId?:string;
    }
    let {formFlow = $bindable(),parentFormId = formFlow.initialForm}:Props<FormId> = $props();
    let data = $derived(formFlow.data);

    let leftLabel = $derived(data.left !== undefined ? describeOperand(data.left) : 'left');
    let rightLabel = $derived(data.right !== undefined ? describeOperand(data.right) : 'right');
    let checkLabel = $derived(data.variableToCheck !== undefined ? describeOperand(data.variableToCheck) : 'Check');

    (()=>{
        formFlow.setFormDefinition('condition' as FormId,{
            title: (f)=> f.data._conditionIndex != null ? 'Edit Condition' : 'Add Condition',
            onSubmit(form) {
                const parent = form.getDataFromPanel(parentFormId);
                if(!parent){
                    console.error('Passed form was not found!');
                    showError('Internal: Invalid parent form');
                    return 'back';
                }
                const conditions: ConditionalList[] = parent.conditions ?? [];
                const index: number | null = form.data._conditionIndex ?? null;

                const condition: Record<string, any> = {
                    type: form.data.type ?? 'condition-relational'
                };
                if(condition.type === 'condition-relational'){
                    if(form.data.left === undefined || form.data.right === undefined){
                        showError('Set both left and right values');
                        return 'stay';
                    }
                    condition.operator = form.data.operator ?? '==';
                    condition.left = form.data.left;
                    condition.right = form.data.right;
                }else{
                    if(form.data.variableToCheck === undefined){
                        showError('Set the value to check');
                        return 'stay';
                    }
                    condition.variableToCheck = form.data.variableToCheck;
                }
                if(form.data.description){
                    condition.description = form.data.description;
                }

                if(index != null){
                    conditions[index] = condition as ConditionalList;
                }else{
                    conditions.push(condition as ConditionalList);
                }
                parent.conditions = conditions;
                return 'back';
            },
        });
    })();

    function openGetter(prop: string){
        formFlow.data._getter = prop;
        const getterName = formFlow.data._getter;
        const additionalData:Record<string,any> = {
            _parent: 'condition',
            _enableLiterals: true
        };
        if(formFlow.data[getterName] !== undefined){
            const fullIn = formFlow.data[getterName]['in'];
            if(fullIn){
                const [inProperty, targetGet] = fullIn.split(':');
                additionalData['_in'] = inProperty;
                additionalData['fallback'] = formFlow.data[getterName]['fallback'];
                additionalData['variable'] = formFlow.data[getterName]['variable'];
                if(targetGet){
                    const [target, get] = targetGet.split('-');
                    additionalData['_target'] = target;
                    additionalData['_get'] = get;
                }
            }else{
                const propData = formFlow.data[getterName];
                additionalData['_literalValue'] = propData;
                additionalData['_mode'] = 'literal';
                if(typeof propData === 'string')additionalData['_literalType'] = 'string';
                else if(typeof propData === 'number')additionalData['_literalType'] = 'number';
                else if(typeof propData === 'boolean')additionalData['_literalType'] = 'boolean';
            }
        }
        formFlow.enter('getter' as FormId, additionalData);
    }
</script>
<InputSelect id={'condition-input'}
label={'Condition Type:'}
items={[
    {title:'Relational',value:'condition-relational'},
    {title:'Exists',value:'condition-exists'},
    {title:'Is Valid',value:'condition-is-valid'}
    ]}
bind:selected={data.type} wrapDiv/>
{#if data.type === 'condition-relational'}
    <div class="form-group">
        <ButtonPopUp text={leftLabel} onclick={()=>openGetter('left')}/>
        <InputSelect id={'condition-relational-operator'}
        items={[
            {title:'==',value:'=='},
            {title:'!=',value:'!='},
            {title:'>',value:'>'},
            {title:'<',value:'<'}
        ]}
        bind:selected={data.operator}
        label={'Operation:'} />
        <ButtonPopUp text={rightLabel} onclick={()=>openGetter('right')}/>

    </div>
{:else if data.type === 'condition-exists'}
    <div class="form-group">
        <ButtonPopUp text={checkLabel} onclick={()=>openGetter('variableToCheck')}/>
    </div>
{:else if data.type === 'condition-is-valid'}
    <div class="form-group">
        <ButtonPopUp text={checkLabel}
        onclick={()=>openGetter('variableToCheck')}/>
    </div>
{/if}
