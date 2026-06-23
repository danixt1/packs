<script lang="ts">
    import TopBar from "$lib/components/TopBar.svelte";
    import type { World } from "$lib/types/data/declarative";
    import {world as worlData} from "$lib/data/world";
    let selectedWorld:World|null = $state(null);

    interface InfoWolrd{
        name:string
        description:string
        createdAt?:number
        lastEdit?:number
        version:number[]
        load:()=>void,
        del:()=>void
    }
    
    function getAvaliableWorlds(){
        let worlds:InfoWolrd[] = [
            {
                name:'Adventure World',
                description:'The main adventure world',
                version:[1,0,0],
                load() {
                    selectedWorld = worlData;
                },
                del(){}
            }
        ]
        if(typeof window != undefined){
            loadWorldsInfoFromLocalStorage();
        }
        return worlds;
        function loadWorldsInfoFromLocalStorage(key = 'game-worlds'){
            let data = localStorage.getItem(key);
            let resolved:any = null;
            if(!data){
                return
            }
            try {
                resolved = JSON.parse(data);
            } catch (error) {
                if(error instanceof SyntaxError){
                    console.error('Failed loading worlds from local storage.',error.message);
                    return;
                }
                throw error;
            }
            if(!Array.isArray(resolved)){
                return;
            }
            for(const w of resolved){
                if(typeof w.name === 'string'){
                    worlds.push({
                        name:w.name,
                        description:w.description || "None",
                        version:w.version,
                        load() {
                            let data = localStorage.getItem('world-'+w.name);
                            if(!data){
                                //TODO: show message to user as "not found world"
                                console.error(`world-${w.name} not found in localStorage`);
                                return;
                            }
                            let jsonData = JSON.parse(data);
                            selectedWorld = jsonData;
                        },
                        del(){
                            localStorage.removeItem('world-'+w.name);
                        }
                    })
                }
            }
        }
    }
</script>

<div class="page-layout">
    <TopBar worldName="Create" />
    <main>
        {#if selectedWorld == null}
            <div class="worlds">
                <div class="worlds-list">
                    <div>
                        <h1>Avaliable worlds</h1>
                    </div>
                    {#each getAvaliableWorlds() as world}
                        <button class="world-item" onclick={()=>{world.load()}}>
                            <div class="world-title">
                                <h2>{world.name}</h2>
                            </div>
                            {world.description}
    
                        </button>
                    {/each}
                </div>
                <button type="button" class="world-new-btn">Create New World</button>
            </div>
        {/if}

    </main>
</div>
<style>
	.world-new-btn {
		color: var(--color-accent-light);
		background: linear-gradient(135deg, rgba(215, 177, 115, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
		min-height: 3rem;
		cursor: pointer;
		border: 1px solid rgba(215, 177, 115, 0.35);
		border-radius: 8px;
		margin: 11px 0;
		padding: 0.75rem 1.5rem;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		font-size: 1rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		position: relative;
		overflow: hidden;
	}

	.world-new-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(215, 177, 115, 0.2) 0%, transparent 50%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.world-new-btn:hover {
		border-color: rgba(215, 177, 115, 0.7);
		background: linear-gradient(135deg, rgba(215, 177, 115, 0.25) 0%, rgba(255, 255, 255, 0.08) 100%);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(215, 177, 115, 0.2), 0 0 0 1px rgba(215, 177, 115, 0.1);
	}

	.world-new-btn:hover::before {
		opacity: 1;
	}

	.world-new-btn:active {
		transform: translateY(0);
		box-shadow: 0 4px 12px rgba(215, 177, 115, 0.15);
	}
	.page-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		box-sizing: border-box;
	}

	main {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}
    .worlds {
        border: 1px solid var(--border-default);
        border-radius: 7px;
    }
    .worlds,.worlds-list{
        display: flex;
        flex-direction: column;
        align-items: center;
    }
	.worlds-list {
        width: 100%;
		gap: 1rem;
        flex-grow: 1;
        padding: 10px;
	}

	.world-item {
        width: 70%;
        flex-grow: 1;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(215, 177, 115, 0.2);
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
		font-family: inherit;
		font-size: 1rem;
		transition: all 0.2s ease;
	}

	.world-item:hover {
		background: rgba(215, 177, 115, 0.1);
		border-color: rgba(215, 177, 115, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(215, 177, 115, 0.15);
	}

	.world-item:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(215, 177, 115, 0.3);
	}

	.world-title h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #d7b173;
	}
    @media (max-width:780px){
        .world-item{
            width: 96%;
        }
        .worlds-list {
            padding: 5px;
        }
    }
</style>