import type { PageLoad } from './$types';
export const load:PageLoad = async () => {
    return {
        barTitle: 'Editor'
    }
}