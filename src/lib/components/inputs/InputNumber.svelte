<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import BaseInput from "./BaseInput.svelte";

    interface Props extends HTMLInputAttributes {
        id: string;
        name?: string;
        value: number | null | undefined;
        required?: boolean;
        min?: number;
        max?: number;
        label?: string;
        placeholder?: string;
        wrapDiv?: boolean;
    }
    let { id, name, value = $bindable(), required, min, max,label, placeholder, wrapDiv,...attrs }: Props = $props();
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
<input
    type="number"
    id={id}
    data-testid={`input-${id}`}
    name={name}
    bind:value={value}
    class="def-input"
    inputmode="decimal"
    {required}
    {min}
    {max}
    {placeholder}
    {...attrs}
/>
</BaseInput>