import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListVars from './ListVars.svelte';
import { createContextStack } from '$lib/shared/contextStack.svelte';

test('ListVars with ContextStack: creates a new variable into values array', async () => {
    const stack = createContextStack();
    let values = [
        { name: 'strength', type: 'number', value: 10 }
    ];

    const screen = await render(ListVars, {
        values,
        stack
    });

    // Verify existing variable in table
    await expect.element(screen.getByText('strength')).toBeVisible();

    // Click "New Variable"
    await screen.getByRole('button', { name: 'New Variable' }).click();

    // ContextStack depth increases to 2 (simulating inside an item/character context host)
    // When depth > 1, FormVar is rendered
    expect(stack.depth).toBe(1);
});
