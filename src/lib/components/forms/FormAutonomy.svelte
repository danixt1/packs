<script lang="ts">
    import { showError } from "$lib/notify";
    import type { ContextFrame, ContextStack } from "$lib/shared/contextStack.svelte";
    import FormVar from "./FormVar.svelte";
    import ListConditions from "../lists/ListConditions.svelte";
    import OrderedList from "../lists/OrderedList.svelte";
    import {InputNumber,InputSelect,InputSwitch,InputText,InputTextArea} from "$lib/components/inputs"
    import Form from "../Form.svelte";
    import ListVars from "../lists/ListVars.svelte";
    import ObjectTable from "../ObjectTable.svelte";
    import {type CharacterAutonomyGoal, type CharacterAutonomyRule } from "$lib/types/data/declarative";

    interface ActionInfo {
        name: string;
    }

    interface Props {
        onCancel?: () => void;
        onAfterSubmit?: (data: Record<string, any>) => void;
        value?: Record<string, any> | undefined;
        stack: ContextStack;
        actions?: ActionInfo[];
    }

    let {
        onCancel,
        onAfterSubmit,
        value = $bindable({}),
        stack,
        actions
    }: Props = $props();

    let memory = $state<Record<string,any>[]>([]);
    function mainSubmit(){

    }
    async function startCreateRules(){
        if(!value.rules){
            value.rules = [];
        }
        const result =await stack.push({
            title:'Create new Rule',
            data:{type:'idle-rule',when:[]},
            render:AutonomyRule,
            meta:{mode:'create'}
        })
        if(result){
            value.rules.push($state.snapshot(result));
        }
    }
    async function startEditRules(item:any,index:number){
        if(!item.when){
            item.when = [];
        }
        
        const result = await stack.push({
            title:'Editing rule '+item.name,
            data:$state.snapshot(item),
            render:AutonomyRule,
            meta:{mode:'edit',index}
        })
        if(result){
            value.rules[index] = $state.snapshot(result);
        }
    }
    async function startCreateGoal(){
        if(!value.goals){
            value.goals = [];
        }
        const result = await stack.push({
            title:'Creating Goal',
            data:{when:[],stayActiveIf:[]},
            meta:{mode:'create'},
            render:AutonomyGoal
        })
        if(result){
            value.goals.push($state.snapshot(result));
        }
    }
    async function startEditGoal(item:any,index:number) {
        if(!item.when){
            item.when = [];
        }
        if(!item.stayActiveIf){
            item.stayActiveIf = []
        }
        const result = await stack.push({
            title:'Editing goal '+item.name,
            data:$state.snapshot(item),
            meta:{mode:'edit',index},
            render:AutonomyGoal
        });
        if(result){
            value.goals[index] = item;
        }
    }
</script>
{#snippet AutonomyGoal(frame:ContextFrame)}
    <Form onSubmit={()=>frame.resolve(frame.draft)} onCancel={()=>frame.cancel()}>
        <InputText id='autonomy-goal-name' label='Name:' bind:value={frame.draft.name} autocomplete='off' />
        <InputText id='autonomy-goal-description' label='Description:' bind:value={frame.draft.description} autocomplete='off' />
        <InputNumber id='autonomy-goal-priority' label='Priority:' bind:value={frame.draft.priority}/>
        <h3>When:</h3>
        <ListConditions {stack} bind:values={frame.draft.when} />
        <h3>Stay Active If:</h3>
        <ListConditions {stack} bind:values={frame.draft.stayActiveIf} />
    </Form>
{/snippet}
{#snippet AutonomyRule(frame:ContextFrame)}
    <Form onSubmit={()=>frame.resolve(frame.draft)} onCancel={()=>frame.cancel()}>
        <div class="form-group">
            <InputSelect id='autonomy-rule-type' label='Type:' bind:selected={frame.draft.type} items={[
                {title:'Idle',value:'idle-rule'},
                {title:'Action',value:'action-rule'}
            ]} />
            <h3>When:</h3>
            <ListConditions {stack} bind:values={frame.draft.when} />
            <InputText id='autonomy-rule-name' label='Name:' bind:value={frame.draft.name} autocomplete='off' />
            <InputText id='autonomy-rule-description' label='Description:' bind:value={frame.draft.description} autocomplete='off' />
            <InputNumber id='autonomy-rule-priority' label='Priority:' bind:value={frame.draft.priority}/>
            <InputText id='autonomy-rule-goal' label='Goal:' bind:value={frame.draft.goal} autocomplete='off'/>
            <InputNumber id='autonomy-rule-cooldown' label='Cooldown' bind:value={frame.draft.cooldown} />
            {#if frame.draft.type == 'action-rule'}
                <InputNumber id='autonomy-rule-weight' label='Weight:' bind:value={frame.draft.weight} />
                <InputSelect id='autonomy-rule-type' label='Type:' bind:selected={frame.draft.targeting} items={[
                    {title:'First Valid',value:'firstValid'},
                    {title:'Random Valid',value:'randomValid'},
                    {title:'All Valid',value:'allValid'}
                ]} />
            {/if}
            {#if frame.draft.type == 'idle-rule'}
                <InputNumber id='autonomy-rule-duration' label='Duration:' bind:value={frame.draft.duration} />
            {/if}
        </div>
    </Form>
{/snippet}
<Form onSubmit={()=>mainSubmit()} onCancel={()=>{onCancel?.();}}>
    <div class="form-group">
        <InputSwitch label="Enabled?" id="autonomy-enabled" bind:value={value.enable}/>
        <InputNumber label="Interval Between decisions" id='autonomy-decisionInterval' bind:value={value.decisionInterval}/>
        <InputNumber label="Max Decisions per turn" id='autonomy-maxActionsPerCycle' bind:value={value.maxActionsPerCycle}/>
    </div>
    <ListVars title='Memory Variables:' {stack} bind:values={memory}/>
    <div class="form-group">
        {#if value.rules && value.rules.length  > 0}
            <h3>Rules</h3>
            <ObjectTable ref={value.rules} 
            onEdit={(e)=>{const index = value.rules.findIndex((a:any)=>a.name == e.name);startEditRules(e,index)}}
            onDelete={(e)=>{value.rules = value.rules.filter((a:any) =>(e.name != a.name))}}
            items={value.rules.map((e:CharacterAutonomyRule) =>({
                Type:e.type,
                Name:e.name,
                Priority:e.priority
            }))}
            headers={['Type','Name','Priority']}
             />
            <div class="form-group">
                <button onclick={startCreateRules}>Add new Rules</button>
            </div> 
        {:else}
            <div class="form-group">
                <p>No Rules added!</p>
                <button onclick={startCreateGoal}>Add new Rule</button>
            </div>
        {/if}  
    
        {#if value.goals && value.goals.length > 0}
            <h3>Goals</h3>
            <ObjectTable ref={value.goals}
            onEdit={(e)=>{const index = value.goals.findIndex((a:any)=>a.name == e.name);startEditGoal(e,index)}}
            onDelete={(e)=>{value.goals = value.goals.filter((a:any) =>(e.name != a.name))}}
            items={value.goals.map((e:CharacterAutonomyGoal) =>({
                Name:e.name,
                Priority:e.priority,
                When:e.when ? e.when.length + ' conditions': 'None'
            }))}
            headers={['Name','Priority','When']}
            />
            <div class="form-group">
                <button onclick={startCreateGoal}>Add new Goal</button>
            </div> 
        {:else}
            <div class="form-group">
                <p>No Goals added!</p>
                <button onclick={startCreateGoal}>Add new Goal</button>
            </div>
        {/if}
    </div>
</Form>
<style>
    button {
        margin-right: 5px;
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    button:hover {
        background-color: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>