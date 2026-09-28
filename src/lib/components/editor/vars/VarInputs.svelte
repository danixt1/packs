<script lang="ts" generics="FormId extends string">
    /**
     * A fomr called "variable" is required to use this components.
     * 
     * the definition of the form is defined by the component itself.
    */
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";
    import { InputText, InputNumber, InputSelect,InputSwitch } from "$lib/components/inputs";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    import type { VariableDeclarator } from "$lib/types/data/declarative";
    import { showError } from "$lib/notify";

    interface Props<FormId extends string> {
        formFlow:"variable" extends FormId ? FormPopupFlow<FormId> : never;
        parentFormId?:string
    }
    let {formFlow, parentFormId = formFlow.initialForm}:Props<FormId> = $props();
    let data = $derived(formFlow.data);
    (()=>{
        formFlow.setFormDefinition('variable' as FormId,{
            title(form) {
                return formFlow.getDataFromPanel(parentFormId)?._varRef
                ? 'Editing Variable'
                : 'Create Variable';
            },
            onSubmit(form) {
                const parent = formFlow.getDataFromPanel(parentFormId);
                if (!parent) {
                    showError('Reference object not found');
                    return 'back';
                }
                const vars: VariableDeclarator[] = parent.vars ?? [];
                if (parent._varRef) {
                    const index = vars.findIndex((v) => v.name === parent._varRef);
                    delete parent._varRef;
                    if (index >= 0) {
                        vars[index] = data as VariableDeclarator;
                    } else {
                        showError('Variable not found');
                        return 'back';
                    }
                } else {
                    if (vars.find((v) => v.name === data.name)) {
                        showError('Variable with this name already exists');
                        return 'stay';
                    }
                    vars.push(data as VariableDeclarator);
                }

                parent.vars = vars;
                return 'back';

            },
        });
    })();
</script>
<InputText id="varName" label="Name" bind:value={data.name} wrapDiv required autocomplete="off" />
<InputSelect id="varType" label="Type" items={[
    {value:'string',title:'String'},
    {value:'number',title:'Number'},
    {value:'boolean',title:'Boolean'},
]} bind:selected={data.type} wrapDiv />
{#if data.type === 'string'}
    <InputText id="varValue" label="Value" bind:value={data.value} wrapDiv autocomplete="off" />
{:else if data.type === 'number'}
    <BaseInput id="varValues" wrapDiv>
        <table>
            <thead>
                <tr>
                    <th>Min</th>
                    <th>Actual</th>
                    <th>Max</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><InputNumber id="varMin"  bind:value={data.min} placeholder="Min(Not set)" /></td>
                    <td><InputNumber id="varValue" bind:value={data.value} placeholder="Actual" /></td>
                    <td><InputNumber id="varMax" bind:value={data.max} placeholder="Max(Not set)" /></td>
                </tr>
            </tbody>
        </table>
    </BaseInput>
{:else if data.type === 'boolean'}
    <InputSwitch id="varValue" label="Activate?" bind:value={data.value} wrapDiv />
{/if}