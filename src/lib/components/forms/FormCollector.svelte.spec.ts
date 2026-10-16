import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FormCollectorStackHarness from './__tests__/FormCollectorStackHarness.svelte';

test('opens the conditions editor for an entity collector', async () => {
    const screen = await render(FormCollectorStackHarness);

    await screen.getByRole('button', { name: 'Open collector' }).click();
    await expect.element(screen.getByTestId('input-collector-target')).toBeVisible();
});

test('opens the condition form after clicking Add Condition', async () => {
    const screen = await render(FormCollectorStackHarness);

    await screen.getByRole('button', { name: 'Open collector' }).click();
    await screen.getByRole('button', { name: 'Add Condition' }).click();

    await expect.element(screen.getByTestId('input-condition-type')).toBeVisible();
});
