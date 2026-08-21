<script lang="ts">
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
    }
    let { id, name, value = $bindable(), required = false, minlength, maxlength, label, wrapDiv }: Props = $props();
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
    <textarea
    id={id}
    name={name}
    bind:value={value}
    class="def-input"
    {required}
    {minlength}
    {maxlength}
    ></textarea>
</BaseInput>