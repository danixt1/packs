import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListConditions from './ListConditions.svelte';
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

test('delegates create and edit actions when no ContextStack is supplied', async () => {
    const onCreatePressed = vi.fn();
    const onEdit = vi.fn();
    const values = [condition('door')];
    const screen = await render(ListConditions, {
        values,
        onCreatePressed,
        onEdit
    });

    await screen.getByRole('button', { name: 'Edit' }).click();
    expect(onEdit).toHaveBeenCalledWith(values[0], 0);

    await screen.getByRole('button', { name: 'Add Condition' }).click();
    expect(onCreatePressed).toHaveBeenCalledOnce();
});

test('allows condition tokens in any order while editing', async () => {
    const screen = await render(ListConditions, { values: [] });

    const andButton = screen.getByRole('button', { name: 'AND' });
    await expect.element(andButton).not.toBeDisabled();
    await andButton.click();

    await expect.element(screen.getByText('No conditions yet. Add a condition to start.')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'OR' })).not.toBeDisabled();
});
