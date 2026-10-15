import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListConditions from './ListConditions.svelte';
import { createPageSwitch } from '$lib/shared/pageSwitch';
import type { ConditionRelational } from '$lib/types/data/declarative';

const condition = (value: string): ConditionRelational => ({
    type: 'condition-relational',
    operator: '==',
    left: value,
    right: value
});

test('removes a condition from the list', async () => {
    const screen = await render(ListConditions, {
        values: [condition('door')]
    });

    await expect.element(screen.getByText('"door" == "door"')).toBeVisible();

    await screen.getByRole('button', { name: 'Delete' }).click();

    await expect.element(screen.getByText('No conditions yet. Add a condition to start.')).toBeVisible();
    await expect.element(screen.getByText('"door" == "door"')).not.toBeInTheDocument();
});

test('hydrates the condition form when editing an existing condition', async () => {
    const switcher = createPageSwitch();
    switcher.createSwitch({}, 'action');
    const conditionPage = switcher.createSwitch({ form: {} }, 'activation-conditions');
    const values = [condition('door')];
    const screen = await render(ListConditions, {
        values,
        switcher,
        page: conditionPage
    });

    await screen.getByRole('button', { name: 'Edit' }).click();

    await screen.unmount();
    const remountedScreen = await render(ListConditions, {
        values,
        switcher,
        page: conditionPage
    });

    await expect.element(remountedScreen.getByTestId('input-condition-type')).toHaveValue('condition-relational');
    await expect.element(remountedScreen.getByRole('button', { name: '"door"' }).first()).toBeVisible();
    await expect.element(remountedScreen.getByRole('button', { name: '"door"' }).last()).toBeVisible();
});
