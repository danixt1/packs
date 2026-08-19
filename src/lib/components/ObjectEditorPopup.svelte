<script lang="ts">
    import { tick } from 'svelte';

    interface Props{
        open: boolean;
        properties: TObjectEditorPopUp.Properties;
        title?: string;
        onClose?: () => void;
        onCreate: (object: any) => void;
    }
    let { open = $bindable(false), properties, title, onClose, onCreate }: Props = $props();
    let formData = $state<Record<string, any>>({});
    let firstInput = $state<HTMLElement | null>(null);
    
    function initializeFormData() {
        formData = {};
        for (const property of properties) {
            formData[property.name] = property.value ?? '';
        }
    }
    initializeFormData();
    $effect(() => {
        if (open) {
            tick().then(() => firstInput?.focus());
        }
    });
    function close() {
        open = false;
        onClose?.();
    }
</script>
<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') close(); }} />
{#if open}
    <div class="popup-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <dialog open class="popup" aria-labelledby="object-editor-title">
            <form onsubmit={(event) => { event.preventDefault(); onCreate(formData); close(); }}>
                <h2 id="object-editor-title">{title ?? 'Create Object'}</h2>
                {#each properties as property, index}
                    <div class="form-group">
                        <label for={property.name}>{property.title ?? property.name}</label>
                        {#if property.type === 'string'}
                            <input
                                bind:this={null,(e)=>{if (index === 0){firstInput = e}}}
                                type="text"
                                id={property.name}
                                name={property.name}
                                bind:value={formData[property.name]}
                                minlength={property.minlength?.value}
                                maxlength={property.maxlength?.value}
                                required={property.required?.value}
                            />
                        {:else if property.type === 'number'}
                            <input
                                bind:this={null,(e)=>{if (index === 0){firstInput = e}}}
                                type="number"
                                id={property.name}
                                name={property.name}
                                bind:value={formData[property.name]}
                                min={property.min?.value}
                                max={property.max?.value}
                                required={property.required?.value}
                            />
                        {:else if property.type === 'textarea'}
                            <textarea
                                bind:this={null,(e)=>{if (index === 0){firstInput = e}}}
                                id={property.name}
                                name={property.name}
                                bind:value={formData[property.name]}
                                minlength={property.minlength?.value}
                                maxlength={property.maxlength?.value}
                                required={property.required?.value}
                            ></textarea>
                        {/if}
                        {#if property.additionalInfo}
                            <small>{property.additionalInfo}</small>
                        {/if}
                    </div>
                {/each}
                <div class="form-actions">
                    <button type="submit">Create</button>
                    <button type="button" onclick={close}>Cancel</button>
                </div>
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
        padding: 0;
        width: min(100%, 30rem);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        background: var(--bg-panel-solid);
        color: var(--color-text);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.55);
    }
    h2 {
        margin: 0;
        padding: 1rem;
        border-bottom: var(--border-subtle) 1px solid;
        font-size: 18px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 1rem;
    }
    .form-group label {
        font-weight: bold;
    }
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
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 1rem;
        border-top: var(--border-subtle) 1px solid;
    }
    button {
        background-color: var(--bg-button);
        color: var(--color-text);
        border: var(--border-subtle) 1px solid;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        transition: background-color 0.2s, border-color 0.2s;
    }
</style>