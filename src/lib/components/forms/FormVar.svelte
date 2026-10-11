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
        /** Automatic modify the data in some object with properties `vars`, while respecting edit/add rules.*/
        autoAttach?:Record<string,any>;
        /** Instead of making a Form pass the property who should by passed to Form*/
        writeFormPropsTo?:Record<string,any>;
        //onFinish?:()=>void
    }
    let { onCancel, onAfterSubmit, value:data = $bindable({}), autoAttach,writeFormPropsTo = $bindable()}: Props = $props();
    $effect(()=>{
        if(!writeFormPropsTo){
            return;
        }
        // FormVar is mounted again when switching back from the variable list.
        // Refresh the callbacks so the parent form never keeps a stale form instance.
        if(writeFormPropsTo.onSubmit !== onSubmit || writeFormPropsTo.onCancel !== onCancel){
            writeFormPropsTo = {...writeFormPropsTo,onSubmit,onCancel};
        }
    })
    $effect(()=>{
        if(data.type == 'boolean' && typeof data.value != 'boolean'){
            data.value = false;
        }
    })
    function onSubmit(){
        if(data.name!.includes(' ')){
            showError('Variable name cannot have spaces');
            return;
        }
        if(autoAttach){
            const finalData = $state.snapshot(data);
            let attachTo = autoAttach;
            
            if(typeof finalData._editing === 'number'){
                
                const editing = finalData._editing;
                for(let i = 0;i < attachTo.vars.length;i++){
                    if(attachTo.vars[i].name == finalData.name && i != editing){
                        showError('Already exist another variable with this name!');
                        return;
                    }
                }
                delete finalData._editing;
                attachTo.vars[editing] = finalData;
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
        }
        onAfterSubmit?.(data as VariableDeclarator);
    }
</script>
{#snippet inputs()}
    <div class="form-group">
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
    </div>
{/snippet}
{#if writeFormPropsTo}
    {@render inputs()}
{:else}
<Form onSubmit={onSubmit} onCancel={onCancel}>
    {@render inputs()}
</Form>
{/if}