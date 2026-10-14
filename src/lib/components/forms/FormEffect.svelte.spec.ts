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

    await screen.getByTestId('input-effect-event').fill('DOOR_OPENED');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith({
        type: 'event',
        event: 'DOOR_OPENED'
    });
});

test('edits structured event context and payload fields', async () => {
    const eventEffect: EffectFomAction = {
        type: 'event',
        event: 'CHARACTER_ATTACKED',
        context: {
            actorId: { type: 'getter', in: 'self-metadata', variable: 'id' },
            targetId: { type: 'getter', in: 'target:character-metadata', variable: 'id' },
            audience: 'place',
            tags: ['combat']
        },
        data: {
            damage: { type: 'getter', in: 'temp-variable', variable: 'damageDealt' },
            attackerName: 'Arthur'
        }
    };
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffect, { value: eventEffect, onAfterSubmit });

    await expect.element(screen.getByRole('button', { name: 'Edit getter' }).first()).toBeVisible();
    await expect.element(screen.getByTestId('input-effect-event-data')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith(eventEffect);
});

test('adds event payload values with structured controls', async () => {
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffect, { onAfterSubmit });

    await screen.getByTestId('input-effect-event').fill('PLACE_DISCOVERED');
    await screen.getByRole('button', { name: 'Add data field' }).click();
    await screen.getByTestId('input-event-data-name-0').fill('discovery');
    await screen.getByTestId('input-event-data-value-0').fill('ancient ruins');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith({
        type: 'event',
        event: 'PLACE_DISCOVERED',
        data: { discovery: 'ancient ruins' }
    });
});

test('edits a setter effect and loads its getter fields', async () => {
    const screen = await render(FormEffect, { value: setterEffect });

    await expect.element(screen.getByTestId('input-effect-type')).toHaveValue('setter');

    await screen.getByRole('button', { name: 'Edit variable getter' }).click();

    await expect.element(screen.getByTestId('input-getter-location')).toHaveValue('self');
    await expect.element(screen.getByTestId('input-getter-get')).toHaveValue('variable');
    await expect.element(screen.getByTestId('input-getter-variable')).toHaveValue('health');
});

test('edits the literal value of a setter effect', async () => {
    const screen = await render(FormEffect, { value: setterEffect });

    await screen.getByRole('button', { name: 'Edit literal value' }).click();

    await expect.element(screen.getByTestId('input-value-type')).toHaveValue('number');
    await expect.element(screen.getByTestId('input-value-number')).toHaveValue(20);
});

test('renders only one getter editor at a time for move effects', async () => {
    const screen = await render(FormEffect, { value: moveEffect });

    await expect.element(screen.getByRole('button', { name: 'Edit character to move' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Edit destination' })).toBeVisible();

    await screen.getByRole('button', { name: 'Edit character to move' }).click();
    await expect.element(screen.getByTestId('input-getter-variable')).toHaveValue('id');
    await expect.element(screen.getByRole('button', { name: 'Edit destination' })).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Cancel' }).click();
    await screen.getByRole('button', { name: 'Edit destination' }).click();
    await expect.element(screen.getByTestId('input-getter-location')).toHaveValue('target');
    await expect.element(screen.getByTestId('input-getter-target')).toHaveValue('place');
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
for(const effectName of ['Move','Event','Conditional','Set variable','Start dialogue']){
    test(`fail on not passed data on ${effectName}`,async ()=>{
        const onAfterSubmit = vi.fn();
        const screen = await render(FormEffect, {onAfterSubmit});
        await screen.getByTestId('input-effect-type').selectOptions(effectName);
        await screen.getByRole('button', { name: 'Confirm' }).click();
        await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(0);
    })

}