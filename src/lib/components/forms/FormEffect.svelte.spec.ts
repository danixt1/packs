import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FormEffect from './FormEffect.svelte';
import type { EffectFomAction } from '$lib/types/data/declarative';

const setterEffect: EffectFomAction = {
    type: 'setter',
    var: { type: 'getter', in: 'self-variable', variable: 'health' },
    mode: 'increment',
    value: 20
};

const moveEffect: EffectFomAction = {
    type: 'move',
    moveId: { type: 'getter', in: 'self-variable', variable: 'id' },
    toId: { type: 'getter', in: 'target:place-metadata', variable: 'id' }
};

test('adds an event effect from the standalone form', async () => {
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffect, { onAfterSubmit });

    await screen.getByRole('textbox', { name: 'Event:' }).fill('DOOR_OPENED');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith({
        type: 'event',
        event: 'DOOR_OPENED'
    });
});

test('edits a setter effect and loads its getter fields', async () => {
    const screen = await render(FormEffect, { value: setterEffect });

    await expect.element(screen.getByRole('combobox', { name: 'Effect type:' })).toHaveValue('setter');

    await screen.getByRole('button', { name: 'Edit variable getter' }).click();

    await expect.element(screen.getByRole('combobox', { name: 'In:' })).toHaveValue('self');
    await expect.element(screen.getByRole('combobox', { name: 'Get:' })).toHaveValue('variable');
    await expect.element(screen.getByRole('textbox', { name: 'Variable:' })).toHaveValue('health');
});

test('edits the literal value of a setter effect', async () => {
    const screen = await render(FormEffect, { value: setterEffect });

    await screen.getByRole('button', { name: 'Edit literal value' }).click();

    await expect.element(screen.getByRole('combobox', { name: 'Type:' })).toHaveValue('number');
    await expect.element(screen.getByRole('spinbutton', { name: 'Value:' })).toHaveValue(20);
});

test('renders only one getter editor at a time for move effects', async () => {
    const screen = await render(FormEffect, { value: moveEffect });

    await expect.element(screen.getByRole('button', { name: 'Edit character to move' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Edit destination' })).toBeVisible();

    await screen.getByRole('button', { name: 'Edit character to move' }).click();
    await expect.element(screen.getByRole('textbox', { name: 'Variable:' })).toHaveValue('id');
    await expect.element(screen.getByRole('button', { name: 'Edit destination' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Cancel' }).click();
    await screen.getByRole('button', { name: 'Edit destination' }).click();
    await expect.element(screen.getByRole('combobox', { name: 'In:' })).toHaveValue('target');
    await expect.element(screen.getByRole('combobox', { name: 'Object:' })).toHaveValue('place');
});

test('opens conditional effect editors from the main effect form', async () => {
    const conditionalEffect: EffectFomAction = {
        type: 'conditional',
        conditions: [],
        onTrue: [],
        onFalse: []
    };
    const screen = await render(FormEffect, { value: conditionalEffect });

    await screen.getByRole('button', { name: /Configure conditions/ }).click();

    await expect.element(screen.getByRole('button', { name: 'Add Condition' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: /Configure true effects/ })).not.toBeInTheDocument();
});