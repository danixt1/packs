<script lang="ts">
    import type { FullAutoFill } from "svelte/elements";

    interface Props {
        id: string;
        name?: string;
        value: string;
        required?: boolean;
        minlength?: number;
        maxlength?: number;
        wrapDiv?: boolean;
        label?: string;
        autocomplete?: FullAutoFill;
        suggestions?: string[];
    }

    let {
        id,
        name,
        value = $bindable(),
        required,
        minlength,
        maxlength,
        label,
        wrapDiv,
        autocomplete = 'off',
        suggestions = []
    }: Props = $props();

    let suggestionsOpen = $state(false);
    let activeSuggestionIndex = $state(-1);

    let listboxId = $derived(`${id}-suggestions`);
    let hasSuggestions = $derived(suggestions.length > 0);
    let filteredSuggestions = $derived(
        suggestions.filter((suggestion) =>value ?
            suggestion.toLowerCase().startsWith(value.trim().toLowerCase()) : true
        )
    );
    let showSuggestions = $derived(
        suggestionsOpen && hasSuggestions && filteredSuggestions.length > 0
    );
    let activeSuggestion = $derived(filteredSuggestions[activeSuggestionIndex]);

    function selectSuggestion(suggestion: string) {
        value = suggestion;
        suggestionsOpen = false;
        activeSuggestionIndex = -1;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!hasSuggestions) return;

        if (event.key === "ArrowDown" && filteredSuggestions.length > 0) {
            event.preventDefault();
            suggestionsOpen = true;
            activeSuggestionIndex = (activeSuggestionIndex + 1) % filteredSuggestions.length;
        } else if (event.key === "ArrowUp" && filteredSuggestions.length > 0) {
            event.preventDefault();
            suggestionsOpen = true;
            activeSuggestionIndex =
                (activeSuggestionIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
        } else if (event.key === "Enter" && showSuggestions && activeSuggestion !== undefined) {
            event.preventDefault();
            selectSuggestion(activeSuggestion);
        } else if (event.key === "Escape" && showSuggestions) {
            event.preventDefault();
            suggestionsOpen = false;
            activeSuggestionIndex = -1;
        }
    }
</script>

{#snippet inputContent()}
    {#if label}
        <label class="def-label input-label" for={id}>{label}</label>
    {/if}

    <div class="input-with-suggestions">
        <input
            type="text"
            id={id}
            data-testid={`input-${id}`}
            name={name}
            bind:value
            class="def-input"
            {required}
            {minlength}
            {maxlength}
            {autocomplete}
            autocorrect="off"
            autocapitalize="none"
            role={hasSuggestions ? "combobox" : undefined}
            aria-autocomplete={hasSuggestions ? "list" : undefined}
            aria-haspopup={hasSuggestions ? "listbox" : undefined}
            aria-expanded={hasSuggestions ? showSuggestions : undefined}
            aria-controls={showSuggestions ? listboxId : undefined}
            aria-activedescendant={showSuggestions && activeSuggestion !== undefined
                ? `${id}-suggestion-${activeSuggestionIndex}`
                : undefined}
            onfocus={() => (suggestionsOpen = true)}
            oninput={() => {
                suggestionsOpen = true;
                activeSuggestionIndex = -1;
            }}
            onblur={() => {
                suggestionsOpen = false;
                activeSuggestionIndex = -1;
            }}
            onkeydown={handleKeydown}
        />

        {#if showSuggestions}
            <ul
                id={listboxId}
                class="suggestion-list"
                role="listbox"
                aria-label={`${label ?? id} suggestions`}
            >
                {#each filteredSuggestions as suggestion, index (index)}
                    <li
                        id={`${id}-suggestion-${index}`}
                        class="suggestion-option"
                        class:active={index === activeSuggestionIndex}
                        role="option"
                        aria-selected={index === activeSuggestionIndex}
                        onpointerdown={(event) => event.preventDefault()}
                        onclick={() => selectSuggestion(suggestion)}
                        onkeydown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                selectSuggestion(suggestion);
                            }
                        }}
                    >
                        {suggestion}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{/snippet}

{#if wrapDiv}
    <div class="form-group">
        {@render inputContent()}
    </div>
{:else}
    {@render inputContent()}
{/if}

<style>
    .input-label {
        display: block;
        margin-bottom: 0.25rem;
    }

    :global(.form-group) .input-label {
        margin-bottom: 0;
    }

    .input-with-suggestions {
        position: relative;
        width: 100%;
    }

    .suggestion-list {
        position: absolute;
        z-index: 20;
        top: calc(100% + 0.25rem);
        right: 0;
        left: 0;
        box-sizing: border-box;
        max-height: min(18rem, 40dvh);
        margin: 0;
        padding: 0.25rem;
        overflow-y: auto;
        overscroll-behavior: contain;
        list-style: none;
        border: 1px solid var(--border-strong);
        border-radius: 6px;
        background: var(--bg-panel-solid, #12141a);
        box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.35);
    }

    .suggestion-option {
        display: flex;
        min-height: 44px;
        box-sizing: border-box;
        align-items: center;
        padding: 0.65rem 0.75rem;
        border-radius: 4px;
        color: var(--color-text, inherit);
        cursor: pointer;
        touch-action: manipulation;
    }

    .suggestion-option:hover,
    .suggestion-option.active {
        background: var(--bg-card-hover, rgba(215, 177, 115, 0.16));
    }
</style>
