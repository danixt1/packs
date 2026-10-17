<script lang="ts">
    import type { ContextStack } from "$lib/shared/contextStack.svelte";
    import { onMount, tick, type Snippet } from "svelte";

    interface Props {
        stack: ContextStack;
        children?: Snippet;
        onBreadcrumbClick?: (frameId: string) => void;
    }

    let { stack, children, onBreadcrumbClick }: Props = $props();
    let viewPortElement:HTMLDivElement;
    function handleBreadcrumbClick(frameId: string) {
        if (onBreadcrumbClick) {
            onBreadcrumbClick(frameId);
        } else {
            stack.jumpTo(frameId);
        }
    }
    $effect(()=>{
        stack.beforePush((newFrame)=>{
            let scrollTop = document.querySelector('.popup')?.scrollTop;

            newFrame.savedScrollPos = scrollTop;
        })
        stack.afterPop(async (oldFrame)=>{
            await tick();
            let ele = document.querySelector('.popup');
            if(ele){
                ele.scrollTop = oldFrame.savedScrollPos || 0;
            }
        })
    })
</script>

<div class="context-host" data-testid="context-host">
    {#if stack.breadcrumbs.length > 1}
        <nav class="context-breadcrumbs" aria-label="Editor breadcrumbs" data-testid="context-breadcrumbs">
            <ol>
                {#each stack.breadcrumbs as crumb, index (crumb.id)}
                    {@const isLast = index === stack.breadcrumbs.length - 1}
                    <li class="breadcrumb-item" class:current={isLast}>
                        {#if isLast}
                            <span class="crumb-current" aria-current="location">{crumb.title}</span>
                        {:else}
                            <button
                                type="button"
                                class="crumb-link"
                                onclick={() => handleBreadcrumbClick(crumb.id)}
                                data-testid={`crumb-${crumb.id}`}
                            >
                                {crumb.title}
                            </button>
                            <span class="crumb-separator" aria-hidden="true">&gt;</span>
                        {/if}
                    </li>
                {/each}
            </ol>
        </nav>
    {/if}

    <div
        bind:this={viewPortElement}
        class="context-frame-viewport"
        data-testid="context-frame-viewport"
        data-frame-id={stack.current?.id}
        data-frame-depth={stack.depth}
    >
        {#if stack.frames.length > 0}
            {#each stack.frames as frame, i (frame.id)}
                {@const isActive = i === stack.frames.length - 1}
                <div
                    class="context-frame-layer"
                    class:layer-active={isActive}
                    class:layer-hidden={!isActive}
                    data-frame-id={frame.id}
                    data-frame-depth={i + 1}
                    data-testid="context-frame-layer"
                >
                    {#if frame.render}
                        {@render frame.render(frame)}
                    {/if}
                </div>
            {/each}
        {/if}
        {#if children}
            {@render children()}
        {/if}
    </div>
</div>

<style>
    .context-host {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 0.75rem;
    }

    .context-frame-layer.layer-hidden {
        display: none !important;
    }

    .context-frame-layer.layer-active {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .context-breadcrumbs {
        padding: 0.35rem 0.65rem;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        font-size: 0.85rem;
    }

    .context-breadcrumbs ol {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        margin: 0;
        padding: 0;
        gap: 0.35rem;
    }

    .breadcrumb-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }

    .crumb-link {
        background: none;
        border: none;
        color: var(--color-accent, #4aa3df);
        cursor: pointer;
        padding: 0;
        font: inherit;
        text-decoration: underline;
    }

    .crumb-link:hover {
        opacity: 0.8;
    }

    .crumb-current {
        color: var(--color-text, #fff);
        font-weight: 600;
    }

    .crumb-separator {
        color: var(--border-subtle, #888);
        user-select: none;
    }

    .context-frame-viewport {
        display: flex;
        flex-direction: column;
        width: 100%;
    }
</style>
