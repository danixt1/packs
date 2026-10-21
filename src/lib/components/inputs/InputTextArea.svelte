<script lang="ts">
    import type { HTMLTextareaAttributes } from "svelte/elements";
    import BaseInput from "./BaseInput.svelte";
    interface Props {
        id: string;
        name?: string;
        value?: string;
        required?: boolean;
        minlength?: number;
        maxlength?: number;
        label?: string;
        wrapDiv?: boolean;
        additional?:HTMLTextareaAttributes
    }
    let { id, name, value = $bindable(), required = false, minlength, maxlength, label, wrapDiv,additional = {} }: Props = $props();
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
    <textarea
    id={id}
    data-testid={`input-${id}`}
    name={name}
    bind:value={value}
    class="def-input"
    {required}
    {minlength}
    {maxlength}
    {...additional}
    ></textarea>
</BaseInput>