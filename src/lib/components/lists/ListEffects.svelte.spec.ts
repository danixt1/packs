import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createContextStack } from "$lib/shared/contextStack.svelte";
import ListEffects from './ListEffects.svelte';
import type { EffectFomAction } from '$lib/types/data/declarative';

let generalStack = createContextStack();

test('delete only the choose effect',async ()=>{
    const values:EffectFomAction[] = [
        {
            type:'event',
            event:'TEST_EV'
        },
        {
            type:'move',
            moveId:{type:'getter',in:'self-metadata',variable:'id'},
            toId:'otherId'
        },
        {
            type:'setter',
            mode:'increment',
            value:10,
            var:{type:'getter',in:'self-variable',variable:'test'}
        }
    ];
    const screen = await render(ListEffects,{
        stack:generalStack,
        values
    })
    // Delete the event effect and keep the move and setter effects.
    await screen.getByTestId('orderedlist-button-delete-0').click();
    await expect.element(screen.getByText('Move character')).toBeVisible();
    await expect.element(screen.getByText('Set self-variable')).toBeVisible();
})

test('keeps effects in their new order after dragging', async () => {
    const screen = await render(ListEffects, {
        stack: generalStack,
        values: [
            { type: 'event', event: 'FIRST' },
            {
                type: 'move',
                moveId: { type: 'getter', in: 'self-metadata', variable: 'id' },
                toId: 'otherId'
            }
        ]
    });

    await screen.getByText('Event FIRST').dropTo(screen.getByText('Move character'));

    await expect.element(screen.getByTestId('orderedlist-item-0')).toHaveTextContent('Move character');
    await expect.element(screen.getByTestId('orderedlist-item-1')).toHaveTextContent('Event FIRST');
});

test('shows procedure calls and role swapping in the effect list', async () => {
    const screen = await render(ListEffects, {
        stack: createContextStack(),
        values: [{
            type: 'call-procedure',
            procedure: 'applyDamage',
            arguments: { amount: 7 },
            swapSelfTarget: true
        }]
    });

    await expect.element(screen.getByTestId('orderedlist-item-0')).toHaveTextContent('Call Procedure applyDamage (swap self/target)');
});
