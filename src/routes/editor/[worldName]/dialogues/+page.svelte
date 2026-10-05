<script lang="ts">
    import { getCurrentWorldEditor } from "$lib/shared/worldEditor";
    import { page } from '$app/state';
    import { createFormPopupFlow, type FormPopupTransition } from "$lib/shared/formPopupFlow";
    import type { DialogueMatch, DialogueTree,DialogueNode } from "$lib/types/data/declarative";

    import { InputText, InputTextArea,InputCard } from "$lib/components/inputs";
    import EditorWrapper from "$lib/components/EditorWrapper.svelte";
    import FormPopup from "$lib/components/FormPopup.svelte";
    import ButtonEditorCreate from "$lib/components/editor/ButtonEditorCreate.svelte";
    import ObjectTable from "$lib/components/ObjectTable.svelte";
    import { showError } from "$lib/notify";
    import InputNumber from "$lib/components/inputs/InputNumber.svelte";
    import InputSelect from "$lib/components/inputs/InputSelect.svelte";
    import ButtonPopUp from "$lib/components/editor/ButtonPopUp.svelte";
    import ConditionInput from "$lib/components/editor/conditions/ConditionInput.svelte";
    import ConditionList from "$lib/components/editor/conditions/ConditionList.svelte";
    import GetterInput from "$lib/components/editor/getter/GetterInput.svelte";

    const editor = getCurrentWorldEditor(page.params.worldName);
    let dialogues = $state(editor.getDialogues());
    let formFlow = $state(createFormPopupFlow<'dialogues'|'match'|'node'|'condition'|'getter'>('dialogues',{
        dialogues:{
            title:(f)=>f.data._baseOID ? 'Edit Dialogue' : 'Create Dialogue',
            onSubmit:(f)=>{throw new Error('Not Implement')}
        },
        match:{
            title:'Modify Matching Rules',
            onSubmit:(f)=>{
                const baseForm = f.getDataFromPanel('dialogues')!;
                delete f.data._in;
                delete f.data._label;
                baseForm.match = {
                    ...f.data
                } as DialogueMatch;
                return 'back';
            }
        },
        node:{},
        condition:{},
        getter:{}
    }))
    let selectedLabelKey = $derived(
        formFlow.data._in && formFlow.data._label
            ? `${formFlow.data._in}Labels${formFlow.data._label}`
            : ''
    );

    $effect(() => {
        if(selectedLabelKey){
            if(!Array.isArray(formFlow.data[selectedLabelKey])){
                formFlow.data[selectedLabelKey] = []
            }
        }
    });
    function updateMatchLabels(key:string, label:string, isChecked:boolean){
        const current = Array.isArray(formFlow.data[key]) ? formFlow.data[key] : [];
        formFlow.data[key] = isChecked
            ? [...current, label]
            : current.filter((value:string) => value !== label);
    }
</script>
<EditorWrapper>
    <div>
        <h2>Dialogues</h2>
    </div>
    {#if dialogues.length == 0}
        <p>No dialogue trees have been added yet.</p>
    {:else}
        {@const dialoguesShow = dialogues.map(e=>({
            Id:e.id,
            Name:e.name,
            Nodes:e.nodes.length
        }))}
        <ObjectTable items={dialoguesShow}
        headers={['Id','Name','Categories','Nodes']}
        ref={dialogues}
        onEdit={(e)=>{
            formFlow.enter('dialogues',$state.snapshot(e));
            formFlow.data._baseOID = e.oid;}}
        onDelete={()=>{}}
        />
    {/if}
    <ButtonEditorCreate text="Create Dialogue Tree" onClick={()=>formFlow.open('dialogues')}/>
</EditorWrapper>

<FormPopup {...formFlow.getFormPopupProperties()}>
    {#if formFlow.activeForm === 'dialogues'}
        <InputText id="dial-id" label="Id" bind:value={formFlow.data.id} required wrapDiv autocomplete='off' />
        <InputText id="dial-name" label="Name" bind:value={formFlow.data.name} required wrapDiv autocomplete='off' />
        <InputText id="dial-intent" label="Dialogue Purpose" bind:value={formFlow.data.intent} required wrapDiv autocomplete='off' />
        <InputNumber id='dial-priority' label="Priority" bind:value={formFlow.data.priority} wrapDiv/>
        <div class="form-group">
            <h2>Nodes</h2>
            <ObjectTable items={(formFlow.data.nodes || []).map((e:DialogueNode)=>({
                Id:e.id,
                Text:e.text
            }))}
            headers={['Id','Text']}
            ref={formFlow.data.nodes || []}
            onEdit={(e)=>{
                formFlow.enter('node',$state.snapshot(e));
                formFlow.data._baseid = e.id;}}
            onDelete={(e)=>{
                formFlow.data.nodes = (formFlow.data.nodes || []).filter((n:DialogueNode)=>n.id !== e.id);
            }} />
            <ButtonPopUp text="Add Node" onclick={()=>{formFlow.enter('node')}}/>
        </div>
        <div class="form-group">
            <ButtonPopUp text="Configure matching rules" onclick={()=>formFlow.enter('match',formFlow.data.match || {})}/>
        </div>
    {:else if formFlow.activeForm === 'match'}
    {@const itemChars = editor.getCharacters().map((e)=>({value:e.id,title:`${e.name}(${e.id})`}))}
    {@const itemLabels = editor.getLabels().map(e=>({value:e.name,title:e.title || e.name}))}
        <div class="form-group">
            <div class="info">
                <p>
                    Set a <b>priority</b> when configuring matching rules. 
                    It is also a good idea to create a fallback dialogue for this purpose without any matching rules.
                </p>
            </div>
            <InputCard items={itemChars} id='match-targetCharacterIds' label="Available only for these characters:" bind:selectedItems={formFlow.data.targetCharacterIds}/>
            <h2>Label rules</h2>
            <div class="info">
                <p>
                    Define which labels the target and the speaking character must have for this dialogue tree to be available.
                    You can apply three types of filter:
                </p>
                <ul>
                    <li><b>Any:</b> The character must have at least one of the selected labels.</li>
                    <li><b>All:</b> The character must have every selected label.</li>
                    <li><b>None:</b> The character must not have any of the selected labels.</li>
                </ul>
            </div>
            <div class="in-label">
                <InputSelect id='match-in' label='Apply labels to:' 
                items={[{title:'Target (the character being addressed)',value:'target'},{title:'Self (the character speaking)',value:'self'}]}
                bind:selected={formFlow.data._in}
                />
                <InputSelect id='match-label' label='Filter type:'
                items={[{title:'Any', value:'Any'},{title:'All',value:'All'},{title:'None',value:'None'}]}
                bind:selected={formFlow.data._label}/>

            </div>

            {#if selectedLabelKey}
                {#key selectedLabelKey}
                    <InputCard
                        items={itemLabels}
                        id={`match-${selectedLabelKey}`}
                        label="Select labels:"
                        selectedItems={formFlow.data[selectedLabelKey] ?? []}
                        onChange={(label,isChecked)=>updateMatchLabels(selectedLabelKey, label, isChecked)}
                    />
                {/key}
            {/if}
            <h2>Conditions</h2>
            <ConditionList formFlow={formFlow}/>
        </div>

    {:else if formFlow.activeForm === 'condition'}
        <ConditionInput bind:formFlow={formFlow} parentFormId="match"/>
    {:else if formFlow.activeForm === 'getter'}
        <GetterInput formFlow={formFlow} parentFormId={'condition'}/>
    {:else if formFlow.activeForm === 'node'}
        <InputText id="node-id" label="Node Id" bind:value={formFlow.data.id} required wrapDiv autocomplete='off' />
        <InputTextArea id="node-text" label="Node Text" bind:value={formFlow.data.text} required wrapDiv />
    {/if}
</FormPopup>
<style>
    .in-label{
        display: flex;
        padding: 10px 0px 4px 0px;
    }
    .info{
        border: 1px solid var(--border-default);
        border-left:4px solid var(--border-default);
        padding: 3px 5px;
    }
</style>