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
            display:'Actions',
            name:'actions'
        }
    ];
    let mobileMenuOpen = $state(false);
</script>
<div class="flex-contents">
    <header class="editor-header">
        <div>
            <p class="eyebrow">World editor</p>
            <h1>{page.params.worldName === 'main' ? 'Adventure World' : page.params.worldName}</h1>
        </div>
        <button type="button" class="main-menu-button" onclick={() => goto('#/')}>Main menu</button>
    </header>
    {#if mobileMenuOpen}
        <button 
            class="mobile-menu-toggle" 
            onclick={() => mobileMenuOpen = !mobileMenuOpen}
            aria-label="Toggle menu"
        >
            ✕
        </button>
        <button aria-label="Close menu" class="mobile-menu-backdrop" onclick={() => mobileMenuOpen = false}></button>
    {:else}
        <button 
            class="mobile-menu-toggle-collapsed" 
            onclick={() => mobileMenuOpen = !mobileMenuOpen}
            aria-label="Toggle menu"
        >
            ☰
        </button>
    {/if}
    <nav class="items-bar" class:open={mobileMenuOpen}>
        {#each menus as menu}
            <button onclick={() => { goto("#/editor/"+page.params.worldName+"/"+menu.name); mobileMenuOpen = false; }} class="item-button">
                {menu.display}
            </button>
        {/each}
    </nav>
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
    .items-bar{
        display:flex;
        flex-direction:row;
        flex-wrap:wrap;
        border-bottom:1px solid var(--border-subtle);
        padding:8px;
        gap:2px;
    }
    .mobile-menu-toggle{
        position:fixed;
        top:8px;
        left:8px;
        z-index:1001;
        width:44px;
        height:44px;
        border:none;
        border-radius:8px;
        background:var(--bg-button);
        color:var(--color-text);
        font-size:20px;
        cursor:pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .mobile-menu-toggle-collapsed{
        display:none;
        position:fixed;
        top:60px;
        left:8px;
        z-index:1001;
        width:44px;
        height:44px;
        border:none;
        border-radius:8px;
        background:var(--bg-button);
        color:var(--color-text);
        font-size:20px;
        cursor:pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
        .mobile-menu-toggle-collapsed{
            display:flex;
            align-items:center;
            justify-content:center;
        }
        .mobile-menu-backdrop{
            display:block;
        }
        .items-bar{
            position:fixed;
            top:0;
            left:0;
            height:100%;
            width:200px;
            margin:0;
            padding-top:52px;
            background:var(--bg-base);
            border-right:1px solid var(--border-subtle);
            transform:translateX(-100%);
            transition:transform 0.25s ease;
            z-index:1000;
        }
        .items-bar.open{
            transform:translateX(0);
        }
        main{
            padding-top:52px;
        }
        .editor-header{
            padding-left:1rem;
        }
        .editor-header h1{
            font-size:1rem;
        }
    }
</style>