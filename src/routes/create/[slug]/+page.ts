import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { world } from '$lib/data/world';

export const load: PageLoad = async ({ params }) => {
    let slug = params.slug;
    console.log(slug);
    
    let worldToLoad = localStorage.getItem('world-'+slug);
    if(!worldToLoad){
        if(slug != 'main'){
            error(404, 'World not found');
        }
        return {
            world
        }
    }
    return {
        world: JSON.parse(worldToLoad)
    }
}