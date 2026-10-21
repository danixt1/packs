<script lang="ts">
    import { showError, showSucess } from "$lib/notify";

    interface Props{
        onCopy():Record<string,any>
        onPaste(receivedData:Record<string,any>):void,
        name:string
    }
    let {onCopy,onPaste,name}:Props = $props();
    async function handleOnCopy(){
        let data = onCopy();
        let dataToPass ='PACKS-'+name +JSON.stringify(data);
        try{
            await navigator.clipboard.writeText(dataToPass);
            showSucess('Copied to clipboard!');
        }catch(e){
            showError('Copy Rejected');
        }
    }
    async function handleOnPaste(){
        let res = await navigator.clipboard.readText().catch( ()=>{showError('Clipboard read rejected!')});
        if(!res){
            showError('Rejected!');
            return;
        }
        let start = 'PACKS-'+name;
        if(!res.startsWith(start)){
            showError('Not a valid object');
            return;
        }
        let newData;
        try{
            newData = JSON.parse(res.substring(start.length));
            showSucess('Data loaded!');
        }catch(e){
            showError('failed loading the data!');
            return;
        }
        onPaste(newData);
    }
</script>
<div class="opts-bar">
    <button type="button" class="margin" onclick={handleOnCopy}>Copy</button>
    <button type="button" onclick={handleOnPaste}>Paste</button>
</div>
<style>
    .opts-bar{
        position: absolute;
        display: flex;
        justify-content: flex-end;
        right: 10px;
    }
    .margin{
        margin-right: 3px;
    }
    .opts-bar button{
        background-color: transparent;
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.15rem 0.5rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .opts-bar button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }
    .opts-bar button:hover {
        background-color: var(--bg-card-hover);
    }
</style>