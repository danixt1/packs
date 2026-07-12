<script lang="ts">
    import { goto } from "$app/navigation";
    let avaliableWorlds = $state(getAvaliableWorlds());

    interface InfoWolrd{
        name:string
        description:string
        createdAt?:number
        lastEdit?:number
        version:number[]
        del:(()=>void) | null
    }

    function handleDelete(e:Event, delFn:(()=>void)|null){
        e.stopPropagation();
        delFn?.();
        avaliableWorlds = getAvaliableWorlds();
    }
    function gotoWorld(name:string){
        if(name == 'Main World'){
            name = 'main';
        }
        goto('#/editor/'+name);
    }
    function getAvaliableWorlds(){
        let worlds:InfoWolrd[] = [
            {
                name:'Main World',
                description:'The main adventure world',
                version:[1,0,0],
                del:null
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
            setWorlds(resolved);
            function setWorlds(worldsToLoad:InfoWolrd[]){
                for(const w of worldsToLoad){
                    if(typeof w.name != 'string'){
                        continue;
                    }
                    worlds.push({
                        name:w.name,
                        description:w.description || "None",
                        version:w.version,
                        del(){
                            let idx = worldsToLoad.findIndex((e)=>e.name === w.name);
                            worldsToLoad.splice(idx,1);
                            localStorage.setItem(key,JSON.stringify(worldsToLoad));
                            localStorage.removeItem('world-'+w.name);
                        }
                    })
                }
            }
        }
    }
</script>

<main>
        <div class="worlds">
            <div class="worlds-list">
                <div>
                    <h1>Avaliable worlds</h1>
                </div>
                {#each avaliableWorlds as world}
                    <button class="world-item" onclick={()=>{gotoWorld(world.name)}} onkeydown={(e)=>{if(e.key==="Enter")gotoWorld(world.name)}}>
                        <div class="world-title">
                            <h2>{world.name}</h2>
                        </div>
                        {world.description}
                        {#if world.del}
                            <div role="button" tabindex="0" title="delete" class="world-delete-btn" onclick={(e)=>handleDelete(e, world.del)} onkeydown={(e)=>{if(e.key==="Enter")handleDelete(e, world.del)}}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                </svg>
                            </div>
                        {/if}
                    </button>
                {/each}
            </div>
            <button type="button" class="world-new-btn">Create New World</button>
        </div>
    
</main>
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
		position: relative;
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

	.world-delete-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: rgba(215, 177, 115, 0.6);
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.world-delete-btn:hover {
		color: #e74c3c;
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