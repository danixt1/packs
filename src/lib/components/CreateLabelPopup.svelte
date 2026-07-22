<script lang="ts">
    import { tick } from 'svelte';

    export type NewLabel = {
        name: string;
        description: string;
    };

    interface Props {
        open: boolean;
        existingLabelNames: string[];
        onCreate: (label: NewLabel) => void;
    }

    let { open = $bindable(false), existingLabelNames, onCreate }: Props = $props();
    let name = $state('');
    let description = $state('');
    let errorMessage = $state('');
    let nameInput = $state<HTMLInputElement>();

    $effect(() => {
        if (open) {
            name = '';
            description = '';
            errorMessage = '';
            tick().then(() => nameInput?.focus());
        }
    });

    function close() {
        open = false;
    }

    function createLabel() {
        const trimmedName = name.trim();
        if (!trimmedName) {
            errorMessage = 'A label name is required.';
            return;
        }

        if (existingLabelNames.some((labelName) => labelName.toLocaleLowerCase() === trimmedName.toLocaleLowerCase())) {
            errorMessage = 'A label with this name already exists.';
            return;
        }

        onCreate({ name: trimmedName, description: description.trim() });
        close();
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) close();
    }
</script>

<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') close(); }} />

{#if open}
    <div class="popup-backdrop" role="presentation" onclick={handleBackdropClick}>
        <dialog open class="popup" aria-labelledby="create-label-title">
            <header>
                <h2 id="create-label-title">Create label</h2>
                <button type="button" class="close-button" onclick={close} aria-label="Close create label popup">×</button>
            </header>

            <form onsubmit={(event) => { event.preventDefault(); createLabel(); }}>
                <label for="new-label-name">Label name</label>
                <input
                    id="new-label-name"
                    type="text"
                    bind:value={name}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'new-label-error' : undefined}
                    bind:this={nameInput}
                />

                <label for="new-label-description">Description <span>(optional)</span></label>
                <textarea id="new-label-description" rows="3" bind:value={description}></textarea>

                {#if errorMessage}
                    <p id="new-label-error" class="error-message" role="alert">{errorMessage}</p>
                {/if}

                <footer>
                    <button type="button" class="secondary" onclick={close}>Cancel</button>
                    <button type="submit">Create label</button>
                </footer>
            </form>
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
        width: min(100%, 30rem);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-panel-solid);
        color: var(--color-text);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.55);
    }

    header, footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
    }

    header { border-bottom: 1px solid var(--border-subtle); }
    footer { justify-content: flex-end; padding: 1rem 0 0; }
    h2 { margin: 0; font-size: 1.2rem; }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        padding: 1.25rem;
    }

    label { color: var(--color-accent-light); }
    label span { color: var(--color-text); font-size: 0.85rem; }

    input, textarea {
        box-sizing: border-box;
        width: 100%;
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        padding: 0.55rem;
        color: var(--color-text);
        background: var(--bg-base);
        font: inherit;
    }

    input:focus, textarea:focus, button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .error-message { margin: 0.25rem 0 0; color: #e05555; }

    button {
        cursor: pointer;
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        padding: 0.5rem 0.8rem;
        color: var(--color-text);
        background: var(--bg-card-hover);
        font: inherit;
    }

    button:hover { border-color: var(--color-accent); }
    .secondary, .close-button { background: transparent; }
    .close-button { padding: 0.2rem 0.5rem; font-size: 1.3rem; }

    @media (max-width: 480px) {
        .popup-backdrop { padding: 0.5rem; }
        header, form { padding-left: 1rem; padding-right: 1rem; }
    }
</style>
