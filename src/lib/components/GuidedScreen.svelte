<script lang="ts">
    import { untrack, type Snippet } from "svelte";
    import { fly } from "svelte/transition";
    export type NextPhase = (namedPhase:string | undefined | null)=>void
    export type SnippetPhase = Snippet<[NextPhase]>
    interface Props{
        screens:Record<string,SnippetPhase>
        start:string
        wrapDiv?:boolean
        onFinish?():void
    }
    let {screens,start,wrapDiv,onFinish}:Props = $props();
    let currentPhase = $state(untrack(()=>start));
    let nextPhase:NextPhase = (namedPhase)=>{
        if(!namedPhase || !screens[namedPhase]){
            onFinish?.();
            return;
        }
        currentPhase = namedPhase;
    }
</script>
<div class="guided-screen">
    {#key currentPhase}
        <div class={wrapDiv ? "form-group screen-item" : "screen-item"} >
            {@render screens[currentPhase](nextPhase)}
        </div>
    {/key}
</div>
<style>
    .guided-screen {
        display: grid;
        height: 100%;
    }

    .screen-item {
        overflow: hidden;
        grid-area: 1 / 1;
    }
</style>