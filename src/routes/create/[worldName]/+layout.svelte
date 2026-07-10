<script lang="ts">
    import { goto } from '$app/navigation';
    let { children } = $props();
    let menus:{display:string,name:string}[] = [
        {
            display:'Settings',
            name:'settings'
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
            display:'Locations',
            name:'locations'
        },
        {
            display:'Events',
            name:'events'
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
            <button onclick={() => { goto(window.location.hash + '/' + menu.name); mobileMenuOpen = false; }} class="item-button">
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
        flex-direction:row;
        height:100%;
        border-top: 1px solid var(--border-subtle);
    }
    .items-bar{
        display:flex;
        flex-direction:column;
        width:150px;
        border-right: 1px solid var(--border-subtle);
        margin-right: 5px;
        padding: 8px 0;
        gap: 2px;
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
        background:var(--bg-card);
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
        background:var(--bg-card);
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
            width:100%;
            padding-top:52px;
        }
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
        color:var(--color-text);
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
        background-color:var(--bg-card);
    }
</style>