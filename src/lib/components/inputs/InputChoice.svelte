<script lang="ts">
    interface ChoiceItem {
        value: string;
        title: string;
        disabled?: boolean;
    }

    interface Props {
        id: string;
        label: string;
        wrapDiv?: boolean;
        items: ChoiceItem[];
        selected: string;
        disabled?: boolean;
        onchange?: (event: Event) => void;
    }

    let {
        id,
        label,
        wrapDiv,
        items,
        selected = $bindable(),
        disabled = false,
        onchange
    }: Props = $props();
</script>

{#if wrapDiv}
    <div class="form-group">
        <fieldset {id} class="choices" data-testid={`input-${id}`} disabled={disabled}>
            <legend class="def-label">{label}</legend>
            <div class="list">
                {#each items as item (item.value)}
                    <label class="choice" data-testid={`input-radio-${id}-${item.value}`} class:selected={selected === item.value} class:disabled={item.disabled || disabled}>
                        <input
                            type="radio"
                            name={id}
                            value={item.value}
                            bind:group={selected}
                            disabled={item.disabled || disabled}
                            {onchange}
                        />
                        <span>{item.title}</span>
                    </label>
                {/each}
            </div>
        </fieldset>
    </div>
{:else}
    <fieldset {id} class="choices" data-testid={`input-${id}`} disabled={disabled}>
        <legend class="def-label">{label}</legend>
        <div class="list">
            {#each items as item (item.value)}
                <label class="choice" class:selected={selected === item.value} data-testid={`input-radio-${id}-${item.value}`} class:disabled={item.disabled || disabled}>
                    <input
                        type="radio"
                        name={id}
                        value={item.value}
                        bind:group={selected}
                        disabled={item.disabled || disabled}
                        {onchange}
                    />
                    <span>{item.title}</span>
                </label>
            {/each}
        </div>
    </fieldset>
{/if}

<style>
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

    .list {
        display: flex;
        width: 100%;
        overflow: hidden;
        border: 1px solid var(--border-default);
        border-radius: 12px;
        background: var(--bg-panel-solid);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
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

    .choice:first-child {
        border-left: 0;
    }

    .choice:hover:not(.disabled):not(.selected) {
        background: var(--bg-card-hover);
    }

    .choice.selected {
        background: var(--border-strong);
    }

    .choice:focus-within {
        z-index: 1;
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
