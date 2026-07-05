<script lang="ts">
    import TopBar from '$lib/components/TopBar.svelte';
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
    ]
</script>

{@render children()}