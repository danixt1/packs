import type { RenderResult } from "vitest-browser-svelte";

export async function fillGetter(screen:RenderResult<any>,location:'Target'|'Self'|'Runtime',target:null|'Character'|'Place',
    toGet:'Variable'|'Metadata',value:string
){
    await screen.getByTestId('input-getter-location').selectOptions(location);
    if(target != null){
        await screen.getByTestId('input-getter-target').selectOptions(target);
    }
    await screen.getByTestId('input-getter-get').selectOptions(toGet);
    await screen.getByTestId('input-getter-variable').fill(value);
    await screen.getByRole('button', { name: 'Confirm' }).click();
}