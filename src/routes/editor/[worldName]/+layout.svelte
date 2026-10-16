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
</script>
<div class="flex-contents">
    <div class="editor-chrome">
        <header class="editor-header">
            <div>
                <p class="eyebrow">World editor</p>
                <h1>{page.params.worldName === 'main' ? 'Adventure World' : page.params.worldName}</h1>
            </div>
            <div class="header-actions">
                <button type="button" class="main-menu-button" onclick={() => goto('#/')}>Main menu</button>
            </div>
        </header>
        <nav id="editor-navigation" class="items-bar" aria-label="World editor sections">
            {#each menus as menu}
                <button onclick={() => goto("#/editor/"+page.params.worldName+"/"+menu.name)} class="item-button">
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
    main{
        flex:1;
        width:100%;
        min-height:0;
        box-sizing:border-box;
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
        main{
            padding-bottom:calc(6.5rem + env(safe-area-inset-bottom));
            scroll-padding-bottom:calc(6.5rem + env(safe-area-inset-bottom));
        }
        .items-bar{
            position:fixed;
            z-index:1000;
            right:0;
            bottom:0;
            left:0;
            box-sizing:border-box;
            display:grid;
            grid-template-columns:repeat(7, minmax(0, 1fr));
            gap:0.25rem;
            margin:0;
            padding:0.5rem clamp(0.5rem, 2vw, 1rem) calc(0.5rem + env(safe-area-inset-bottom));
            border-top:1px solid var(--border-subtle);
            background:var(--bg-panel-solid);
            box-shadow:0 -0.5rem 1.5rem rgba(0,0,0,0.25);
        }
        .editor-header h1{
            font-size:1rem;
        }
        .item-button{
            width:100%;
            box-sizing:border-box;
            min-width:0;
            min-height:2.75rem;
            align-items:center;
            justify-content:center;
            margin:0;
            border-radius:4px;
            border-left:0;
            border-top:3px solid transparent;
            padding:0.4rem 0.15rem;
            text-align:center;
            font-size:0.75rem;
            line-height:1.15;
        }
        .item-button:hover{
            border-left-color:transparent;
            border-top-color:var(--color-accent);
        }
    }
</style>