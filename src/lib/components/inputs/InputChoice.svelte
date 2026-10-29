<script lang="ts">
    import type { HTMLInputAttributes } from 'svelte/elements';

    export interface ChoiceItem {
        value: string;
        title: string;
        descripton?:string;
        disabled?: boolean;
    }
    
    interface Props extends HTMLInputAttributes{
        id: string;
        label?: string;
        wrapDiv?: boolean;
        items: ChoiceItem[];
        selected: string;
        disabled?: boolean;
        expandedInfo?:boolean;
        applyFocus?:boolean;
    }

    let {
        id,
        label,
        wrapDiv,
        items,
        selected = $bindable(),
        disabled = false,
        applyFocus,
        expandedInfo,
        ...others
    }: Props = $props();
    function focusFirst(node:HTMLDivElement,isFirst:boolean){
        if(applyFocus && isFirst){
            node.focus();
        }
    }
</script>
{#snippet base()}
        <fieldset {id} class="choices" data-testid={`input-${id}`} disabled={disabled}>
            {#if label}
                <legend class="def-label">{label}</legend>
            {/if}
            <div class="list" class:column={expandedInfo}>
                {#each items as item,index (item.value)}
                    <label class="choice" class:selected={selected === item.value} class:disabled={item.disabled || disabled} data-testid={`input-radio-${id}-${item.value}`}>
                        <input
                            use:focusFirst={index === 0}
                            type="radio"
                            name={id}
                            value={item.value}
                            bind:group={selected}
                            disabled={item.disabled || disabled}
                            {...others}
                        />
                        {#if expandedInfo}
                            <div class="expanded">
                                <h3>{item.title}</h3>
                                <span>{item.descripton}</span>
                            </div>
                        {:else}
                            <span>{item.title}</span>
                        {/if}
                    </label>
                {/each}
            </div>
        </fieldset>
{/snippet}
{#if wrapDiv}
    <div class="form-group">
        {@render base()}
    </div>
{:else}
    {@render base()}
{/if}

<style>
    .expanded{
        padding: 5px 0 30px 0;
        width: 100%;
    }
    .choices {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
    }

    .choices legend {
        margin-bottom: 0.25rem;
    }
    .column{
        flex-direction: column;
    }
    .list {
        display: flex;
        width: 100%;
        overflow: hidden;
        border: 1px solid var(--border-default);
        border-radius: 12px;
        background: var(--bg-panel-solid);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .column .choice{
        min-height: auto !important;
    }
    .choice {
        position: relative;
        display: flex;
        flex: 1 1 0;
        align-items: center;
        justify-content: center;
        min-width: 0;
        min-height: 40px;
        padding: 2px 12px;
        border-left: 1px solid var(--border-default);
        background: transparent;
        color: var(--color-text);
        cursor: pointer;
        user-select: none;
        text-align: center;
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
    }
    .column .choice{
        text-align: left;
        border-left: none;
        border-bottom: 1px solid var(--border-default);
    }
    .choice:first-child {
        border-left: 0;
    }
    .choice:last-child{
        border-bottom: 0;
    }
    .choice:hover:not(.disabled):not(.selected) {
        background: var(--bg-card-hover);
    }

    .choice.selected {
        background: var(--border-strong);
    }
    /** Adjust box-shadow radius*/
    .choice:first-child:focus-within{
        border-radius: 12px 0px 0px 12px;
    }
    .choice:last-child:focus-within{
        border-radius: 0px 12px 12px 0px;
    }
    /** Column mode*/
    .column .choice:first-child:focus-within{
        border-radius: 12px 12px 0 0;
    }
    .column .choice:last-child:focus-within{
        border-radius: 0 0 12px 12px;
    }

    .choice:focus-within {
        z-index: 1;
        box-shadow: inset 0 0 0 2px var(--color-accent);
        outline: none;
    }

    .choice input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
        border: 0;
    }

    .choice.disabled {
        color: var(--color-accent-dim);
        cursor: not-allowed;
        opacity: 0.65;
    }
</style>
