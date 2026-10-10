<script lang="ts">
    import { showError } from "$lib/notify";
    import type { VariableDeclarator } from "$lib/types/data/declarative";
    import Form from "../Form.svelte";
    import BaseInput from "../inputs/BaseInput.svelte";
    import InputNumber from "../inputs/InputNumber.svelte";
    import InputSelect from "../inputs/InputSelect.svelte";
    import InputSwitch from "../inputs/InputSwitch.svelte";
    import InputText from "../inputs/InputText.svelte";

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data:VariableDeclarator) => void;
        value?:Record<string,any>;
        /** Automatic links vars property in `linkedObject` to auto edit/create variable.*/
        autoAttach?:{attachTo:Record<string,any>;editingVar:null | number;onFinish?:()=>void};
    }
    let { onCancel, onAfterSubmit, value:data = {}, autoAttach }: Props = $props();
    
    function onSubmit(){
        if(data.name!.includes(' ')){
            showError('Variable name cannot have spaces');
            return;
        }
        if(autoAttach){
            const finalData = $state.snapshot(data);
            let attachTo = autoAttach.attachTo;
            if(autoAttach.editingVar != null){
                for(let i = 0;i < attachTo.vars.length;i++){
                    if(attachTo.vars[i].name == finalData.name && i != autoAttach.editingVar){
                        showError('Already exist another variable with this name!');
                        return;
                    }
                }
                attachTo.vars[autoAttach.editingVar] = finalData;
            }else{
                if(!attachTo.vars){
                    attachTo.vars = [];
                }
                if(attachTo.vars.find((e:any)=>e.name === finalData.name)){
                    showError('Already exist a variable with this name');
                    return;
                }
                attachTo.vars.push(finalData);
            }
            autoAttach.onFinish?.();
        }
        onAfterSubmit?.(data as VariableDeclarator);
    }
</script>
<Form onSubmit={onSubmit} onCancel={onCancel} useWrapDiv>
    <InputText id="varName" label="Name" bind:value={data.name} required autocomplete="off" />
    <InputSelect id="varType" label="Type" items={[
        {value:'string',title:'String'},
        {value:'number',title:'Number'},
        {value:'boolean',title:'Boolean'},
    ]} bind:selected={data.type} />

    {#if data.type === 'string'}
        <InputText id="varValue" label="Value" bind:value={data.value} autocomplete="off" />
    {:else if data.type === 'number'}
        <BaseInput id="varValues">
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
        <InputSwitch id="varValue" label="Activate?" bind:value={data.value} />
    {/if}
</Form>