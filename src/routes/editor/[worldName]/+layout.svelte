<script lang="ts">
    import { goto } from '$app/navigation';
    import {page} from '$app/state';
    let { children } = $props();
    let menus:{display:string,name:string}[] = [
        {
            display:'World',
            name:''
        },
        {
            display:'Items',
            name:'items'
        },
        {
            display:'Characters',
            name:'characters'
        },
        {
            display:'Places',
            name:'places'
        },
        {
            display:'Dialogues',
            name:'dialogues'
        },
        {
            display:'Templates',
            name:'templates'
        },
        {
            display:'Actions',
            name:'actions'
        }
    ];
    let mobileMenuOpen = $state(false);

    function handleWindowKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') mobileMenuOpen = false;
    }
</script>
<svelte:window onkeydown={handleWindowKeydown} />
<div class="flex-contents">
    <div class="editor-chrome" class:menu-open={mobileMenuOpen}>
        <header class="editor-header">
            <div>
                <p class="eyebrow">World editor</p>
                <h1>{page.params.worldName === 'main' ? 'Adventure World' : page.params.worldName}</h1>
            </div>
            <div class="header-actions">
                <button type="button" class="main-menu-button" onclick={() => goto('#/')}>Main menu</button>
                <button
                    type="button"
                    class="mobile-menu-toggle"
                    onclick={() => mobileMenuOpen = !mobileMenuOpen}
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                    aria-controls="editor-navigation"
                >
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>
            </div>
        </header>
        {#if mobileMenuOpen}
            <button
                type="button"
                aria-label="Close menu"
                tabindex="-1"
                class="mobile-menu-backdrop"
                onclick={() => mobileMenuOpen = false}
            ></button>
        {/if}
        <nav id="editor-navigation" class="items-bar" class:open={mobileMenuOpen} aria-label="World editor sections">
            {#each menus as menu}
                <button onclick={() => { goto("#/editor/"+page.params.worldName+"/"+menu.name); mobileMenuOpen = false; }} class="item-button">
                    {menu.display}
                </button>
            {/each}
        </nav>
    </div>
    <main>
        {@render children()}
    </main>
</div>

<style>
    .flex-contents{
        display:flex;
        flex-direction:column;
        min-height:100%;
        box-sizing:border-box;
    }
    .editor-chrome{
        position:relative;
    }
    .editor-chrome.menu-open{
        z-index:1001;
    }
    .editor-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:1rem;
        padding:1rem clamp(1rem, 3vw, 2rem);
        border-bottom:1px solid var(--border-subtle);
    }
    .editor-header h1,
    .editor-header p{
        margin:0;
    }
    .editor-header h1{
        font-size:clamp(1rem, 2vw, 1.35rem);
    }
    .eyebrow{
        margin-bottom:0.25rem !important;
        color:var(--color-accent);
        font-size:0.72rem;
        font-weight:800;
        letter-spacing:0.1em;
        text-transform:uppercase;
    }
    .main-menu-button{
        min-height:2.4rem;
        border:1px solid var(--border-subtle);
        border-radius:6px;
        background:var(--bg-button);
        color:var(--color-accent-light);
        padding:0.5rem 0.8rem;
        font:inherit;
        cursor:pointer;
    }
    .main-menu-button:hover{
        border-color:var(--border-strong);
        background:var(--bg-card-hover);
    }
    .header-actions{
        display:flex;
        align-items:center;
        gap:0.5rem;
        flex-shrink:0;
    }
    .items-bar{
        display:flex;
        flex-direction:row;
        flex-wrap:wrap;
        border-bottom:1px solid var(--border-subtle);
        padding:8px;
        gap:2px;
    }
    .mobile-menu-toggle{
        display:none;
        align-items:center;
        justify-content:center;
        width:2.4rem;
        height:2.4rem;
        padding:0;
        border:none;
        border-radius:8px;
        background:var(--bg-button);
        color:var(--color-text);
        font-size:20px;
        cursor:pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .mobile-menu-toggle:hover{
        background:var(--bg-card-hover);
    }
    .mobile-menu-backdrop{
        display:none;
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.5);
        z-index:999;
    }
    main{
        flex:1;
        width:100%;
        min-height:0;
        overflow:auto;
    }
    
    .item-button{
        display:flex;
        flex-direction:row;
        align-items:center;
        justify-content:flex-start;
        padding:10px 16px;
        border:none;
        border-left: 3px solid transparent;
        background-color: transparent;
        color: var(--color-accent-light);
        font-size:14px;
        cursor:pointer;
        transition: all 0.2s ease;
        margin: 0 4px;
        border-radius: 4px 0 0 4px;
    }
    .item-button:hover{
        background-color:var(--bg-card-hover);
        border-left-color:var(--color-accent);
        color:var(--color-text-bright);
    }
    .item-button:active{
        background-color:var(--bg-button);
    }
    @media (max-width: 640px) {
        .editor-chrome.menu-open .editor-header{
            position:relative;
            z-index:1003;
            background:var(--bg-panel-solid);
        }
        .mobile-menu-toggle{
            display:flex;
        }
        .mobile-menu-backdrop{
            display:block;
            position:fixed;
            inset:0;
            z-index:1000;
            border:0;
            padding:0;
            background:rgba(0,0,0,0.55);
            cursor:default;
        }
        .items-bar{
            position:absolute;
            top:100%;
            right:clamp(1rem, 3vw, 2rem);
            z-index:1002;
            box-sizing:border-box;
            width:min(18rem, calc(100vw - 2rem));
            max-height:calc(100vh - 5rem);
            max-height:calc(100dvh - 5rem);
            flex-direction:column;
            flex-wrap:nowrap;
            margin:0;
            overflow-y:auto;
            overscroll-behavior:contain;
            padding:0.5rem;
            border:1px solid var(--border-subtle);
            border-radius:0.65rem;
            background:var(--bg-panel-solid);
            box-shadow:0 0.75rem 2rem rgba(0,0,0,0.35);
            opacity:0;
            visibility:hidden;
            pointer-events:none;
            transform:translateY(-0.5rem);
            transition:opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
        }
        .items-bar.open{
            opacity:1;
            visibility:visible;
            pointer-events:auto;
            transform:translateY(0);
        }
        .editor-header h1{
            font-size:1rem;
        }
        .item-button{
            width:100%;
            box-sizing:border-box;
            margin:0;
            border-radius:4px;
        }
    }
</style>