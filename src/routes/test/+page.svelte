<script lang="ts">
    import InputMultipleItems, { type ItemList } from "$lib/components/inputs/InputMultipleItems.svelte";
    
    let items:ItemList[] = [
        {name:'world',title:'World',parent:null},
        {name:'florest',title:'Florest',parent:'world'},
        {name:'dungeon',title:'Dungeon',parent:'world'},
        {name:'northDungeon',title:'North Dungeon',parent:'world.dungeon', parentTitle:'World > Dungeon'},

        {name:'combat',title:'Combat',parent:null},
        {name:'againstHumans',title:'Against Humans',parent:'combat'},
        {name:'againstCreatures',title:'Against Creatures',parent:'combat'},
    ]
    let selectedItems:{name:string,parent:string|null}[] = $state([]);
</script>

<InputMultipleItems {items} bind:value={selectedItems}/>

<div class="info">
    {#each selectedItems as i(i.name)}
        <div>{i.name} {i.parent ? "with parent" + i.parent : ''}</div>
    {/each}
</div>