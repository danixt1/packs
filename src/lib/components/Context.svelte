<script lang="ts">
    import { setContext, getContext, type Snippet } from "svelte";
    import type { ContextStack } from "$lib/shared/contextStack.svelte";

    const CONTEXT_STACK_KEY = Symbol('CONTEXT_STACK');

    export function setEditorContextStack(stack: ContextStack) {
        setContext(CONTEXT_STACK_KEY, stack);
    }

    export function getEditorContextStack(): ContextStack | undefined {
        const getter = getContext<() => ContextStack>(CONTEXT_STACK_KEY);
        return getter ? getter() : undefined;
    }

    interface Props {
        children: Snippet;
        stack: ContextStack;
    }

    let { children, stack }: Props = $props();

    setContext(CONTEXT_STACK_KEY, () => stack);
</script>

<div class="editor-context-scope" data-depth={stack.depth} data-current-frame={stack.current?.id}>
    {@render children()}
</div>

<style>
    .editor-context-scope {
        display: contents;
    }
</style>
