<script lang="ts">
    import BaseInput from "./BaseInput.svelte";

    interface Props {
        id: string;
        name?: string;
        value: string;
        required?: boolean;
        minlength?: number;
        maxlength?: number;
        wrapDiv?: boolean;
        label?: string;
    }
    let { id, name, value = $bindable(), required, minlength, maxlength, label, wrapDiv }: Props = $props();
</script>
<BaseInput id={id} label={label} wrapDiv={wrapDiv}>
    <input
        type="text"
        id={id}
        name={name}
        bind:value={value}
        class="def-input"
        {required}
        {minlength}
        {maxlength}
    />
</BaseInput>