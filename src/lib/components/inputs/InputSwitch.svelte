<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        label?: string;
        wrapDiv?: boolean;
        value: boolean;
    }
    let { id, label, wrapDiv, value = $bindable() }: Props = $props();

    function toggle() {
        value = !value;
    }
</script>

<BaseInput {id} {label} {wrapDiv}>
    <button
        type="button"
        class="switch"
        class:on={value}
        role="switch"
        aria-checked={value}
        aria-label={label ?? id}
        onclick={toggle}
    >
        <span class="thumb"></span>
    </button>
</BaseInput>

<style>
    .switch {
        position: relative;
        width: 48px;
        height: 26px;
        border-radius: 999px;
        border: 1px solid var(--border-default);
        background: var(--bg-panel-solid);
        cursor: pointer;
        padding: 0;
        transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .switch.on {
        background: var(--bg-card-hover);
        border-color: var(--border-strong);
    }

    .thumb {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-text);
        transition: transform 0.2s ease-in-out;
    }

    .switch.on .thumb {
        transform: translateX(22px);
    }
</style>
