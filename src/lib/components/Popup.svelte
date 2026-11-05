<script lang="ts">
    import { setCurrentWindowToScroll } from "$lib/shared/pageFocused";
    import type { Snippet } from "svelte";

    interface Props{
        title:string;
        open: boolean;
        onClose?: () => void;
        children: Snippet;
        fullHeight?:boolean;
    }
    let { title, onClose, open, children }: Props = $props();
    let popupPage:HTMLElement|undefined = $state();
    function dismiss() {
        onClose?.();
    }
    $effect(()=>{
        if(open && popupPage){
            setCurrentWindowToScroll(popupPage);
        }
    })
    let isSmarthphone = (()=>typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints > 0 : false)()
</script>
<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') dismiss(); }} />

{#if open}
    <div class="popup-backdrop" role="presentation" onclick={(event) => {if(isSmarthphone)return; if (event.target === event.currentTarget) dismiss(); }}>
        <dialog open class="popup" aria-labelledby="object-editor-title" bind:this={popupPage}>
            <h2 id="object-editor-title">{title ?? 'Create Object'}</h2>
            <div class="children">
                {@render children()}
            </div>
        </dialog>
    </div>
{/if}
<style>
    .popup-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1100;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.88);
    }
    .popup {
        display: flex;
        flex-direction: column;
        z-index: 100;
        padding: 0;
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-panel-solid);
        color: var(--color-text);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.55);
    }
    .children{
        overflow: auto;
    }
    @media screen and (max-width:732px){
        .children{
            flex-shrink: 1;
            overflow: auto;
        }
        .popup{
            width: calc(99% - 2px);
            height: calc(100vh - 4px);
        }
    }
    @media screen and (min-width:732px){
        .popup{
            width: 45rem;
            max-height: 93dvh;
        }
    }
    h2 {
        margin: 0;
        padding: 1rem;
        border-bottom: var(--border-subtle) 1px solid;
        font-size: 18px;
    }
</style>