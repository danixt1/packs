import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
    try {
        return {
            barTitle: "Editor"
        };
    } catch {
        error(404, 'World not found');
    }
}