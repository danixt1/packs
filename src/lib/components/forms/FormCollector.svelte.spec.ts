import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FormCollector from './FormCollector.svelte';

test('opens the conditions editor for an entity collector', async () => {
    const screen = await render(FormCollector, {
        value: { type: 'collector', target: 'character', collectIf: [] }
    });

    await screen.getByRole('button', { name: /Configure conditions/ }).click();

    await expect.element(screen.getByRole('button', { name: 'Add Condition' })).toBeVisible();
});

test('opens the condition form after clicking Add Condition', async () => {
    const screen = await render(FormCollector, {
        value: { type: 'collector', target: 'character', collectIf: [] }
    });

    await screen.getByRole('button', { name: /Configure conditions/ }).click();
    await screen.getByRole('button', { name: 'Add Condition' }).click();

    await expect.element(screen.getByTestId('input-condition-type')).toBeVisible();
});
