<script lang="ts">
    import Form from '$lib/components/Form.svelte';
    import GuidedScreen, { type NextPhase } from '$lib/components/GuidedScreen.svelte';
    import InputChoice from '$lib/components/inputs/InputChoice.svelte';
    import InputText from '$lib/components/inputs/InputText.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { showError } from '$lib/notify';
    import type { HTMLInputAttributes } from 'svelte/elements';

    let data:Record<string,any> = $state({_in:'self'});
    let open = $state(false);

    function ChoiceHandler(handler:()=>void):Pick<HTMLInputAttributes,'onclick'|'onkeydown'>{
        return {
            onclick(ev){
                if(ev.detail){
                    setTimeout(handler,0);
                }
            },
            onkeydown(ev){
                if(ev.key === 'Enter'){
                    // Avoid event propagation to the next screen.
                    setTimeout(handler,0);
                }
            }
        }
    }
</script>

{#snippet init(nextPhase:NextPhase)}
    {@const submitHandler = ()=>{
        if(!data._in){
            showError('Select from where it should get the data!');
            return;
        }
        nextPhase('object');
    }}
    <Form onSubmit={submitHandler}>
        <div class="form-group">
            <h2>Where:</h2>
            <InputChoice id='getter-in' expandedInfo applyFocus bind:selected={data._in} items={[
                    {title:'Self',value:'self',description:'Get From the current object'},
                    {title:'Target',value:'target',description:'Get The value from the object being targeted'},
                    {title:'Runtime',value:'runtime',description:'Get the metadata from the current running'},
                    {title:'World',value:'world',description:'Get variables/metadata related to the world.'},
                    {title:'Temporary Variables',value:'temp',description:'Get Temporary variables'}
                ]}
            {...ChoiceHandler(submitHandler)}
            />
        </div>
    </Form>
{/snippet}

{#snippet object(nextPhase:NextPhase)}
    {@const submitHandler = ()=>{
        if(!data._target){
            showError('A target is required!');
            return;
        }
        nextPhase('dataType');
    }}
    <Form onSubmit={submitHandler}>
        <div class="form-group">
            <h2>Object type</h2>
            <InputChoice id='getter-obj' expandedInfo applyFocus bind:selected={data._target} items={[
                {title:'Character',value:'character',description:'Get data from the character in the context'},
                {title:'Character > Place',value:'character/place',description:'Get data from the place where the current character is.'},
                {title:'Place',value:'Get the data from the place'}
            ]} 
            {...ChoiceHandler(submitHandler)}
            />
        </div>
    </Form>
{/snippet}
{#snippet dataType(nextPhase:NextPhase)}
    {@const submitHandler = ()=>{
        if(!data._get){
            showError('Not Selected the data');
            return
        }
        if(data._get === 'variable'){
            nextPhase('getVar');
        }
    }}
    <Form onSubmit={submitHandler}>
        <div class="form-group">
            <h2>Data From A:</h2>
            <InputChoice id="getter-datatype" expandedInfo applyFocus bind:selected={data._get} items={[
                {title:'Variable',value:'variable',description:'Get the current value from a declared variable'},
                {title:'Metadata',value:'metadata',description:'Get the value from a game metadata'}
            ]}
            {... ChoiceHandler(submitHandler)}
             />
        </div>
    </Form>
{/snippet}

{#snippet getVar(nextPhase:NextPhase)}
    {@const submitHandler = ()=>{
        if(!data.variable){
            showError('No Variable passed');
            return;
        }
    }}
    <Form onSubmit={submitHandler}>
        <div class="form-group">
            <h2>Variable:</h2>
            <InputText id='getter-variable' label='Variable' bind:value={data.variable} />
        </div>
    </Form>
{/snippet}
<button onclick={()=>open=true}>Open</button>
<Popup {open} title='Test' >
    <GuidedScreen screens={{
        init,
        object,
        dataType,
        getVar
    }} start='init' />
</Popup>