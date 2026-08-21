<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        name?: string;
        value: number;
        required?: boolean;
        min?: number;
        max?: number;
        label?: string;
        wrapDiv?: boolean;
    }
    let { id, name, value = $bindable(), required, min, max,label, wrapDiv }: Props = $props();
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
<input
    type="number"
    id={id}
    name={name}
    bind:value={value}
    class="def-input"
    {required}
    {min}
    {max}
    />
</BaseInput>