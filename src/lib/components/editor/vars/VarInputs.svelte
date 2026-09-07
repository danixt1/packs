<script lang="ts">
    import type { FormPopupFlow } from "$lib/shared/formPopupFlow";
    import { InputText, InputNumber, InputSelect,InputSwitch,InputCard } from "$lib/components/inputs";
    import BaseInput from "$lib/components/inputs/BaseInput.svelte";
    interface Props {
        formFlow:FormPopupFlow<any>;
    }
    let {formFlow}:Props = $props();
    let data = $derived(formFlow.data);
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