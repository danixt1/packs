import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FormEffect from './FormEffect.svelte';
import FormEffectStackHarness from './__tests__/FormEffectStackHarness.svelte';
import type { EffectFomAction } from '$lib/types/data/declarative';
import { createContextStack } from '$lib/shared/contextStack.svelte';
import { fillGetter } from './__tests__/testUtils';

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
test('add move event using literal toId',async ()=>{
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffectStackHarness, { onAfterSubmit });

    await screen.getByRole('button', { name: 'Open effect' }).click();
    await screen.getByTestId('input-effect-type').selectOptions('Move');
    await screen.getByTestId('button-move-moveId').click();
    //Getter page
    await fillGetter(screen,'Target','Character','Variable','test');

    await screen.getByTestId('input-effect-move-toId-type').selectOptions('Literal');
    await screen.getByRole('button',{name:'Edit literal value'}).click();

    await screen.getByTestId('input-value-type').selectOptions('String');
    await screen.getByTestId('input-value-string').fill('test');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await screen.getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith({
        type:'move',
        moveId:{
            type:'getter',
            in:'target:character-variable',
            variable:'test'
        },
        toId:'test'
    })
})
test('adds an event effect from the standalone form', async () => {
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffect, { stack: createContextStack(), onAfterSubmit });

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
    const screen = await render(FormEffect, { stack: createContextStack(), value: eventEffect, onAfterSubmit });

    await expect.element(screen.getByTestId('input-effect-event')).toHaveValue('CHARACTER_ATTACKED');
    await expect.element(screen.getByTestId('input-event-context-field-0')).toHaveValue('actorId');
    await expect.element(screen.getByTestId('input-event-context-field-1')).toHaveValue('targetId');
    await expect.element(screen.getByTestId('input-event-context-audience')).toHaveValue('place');
    await expect.element(screen.getByTestId('input-event-context-tag-0')).toHaveValue('combat');
    await expect.element(screen.getByTestId('input-event-data-name-0')).toHaveValue('damage');
    await expect.element(screen.getByTestId('input-event-data-name-1')).toHaveValue('attackerName');
    await expect.element(screen.getByRole('button', { name: 'Edit getter' }).first()).toBeVisible();
    await expect.element(screen.getByTestId('input-effect-event-data')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(1);
    expect(onAfterSubmit).toHaveBeenCalledWith(eventEffect);
});

test('adds event payload values with structured controls', async () => {
    const onAfterSubmit = vi.fn();
    const screen = await render(FormEffect, { stack: createContextStack(), onAfterSubmit });

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
    const stack = createContextStack();
    const screen = await render(FormEffect, { stack, value: setterEffect });

    await expect.element(screen.getByTestId('input-effect-type')).toHaveValue('setter');

    await screen.getByRole('button', { name: 'Edit variable getter' }).click();

    expect(stack.current?.title).toBe('Configure Variable Getter');
    expect(stack.current?.draft).toEqual(setterEffect.var);
});

test('edits the literal value of a setter effect', async () => {
    const stack = createContextStack();
    const screen = await render(FormEffect, { stack, value: setterEffect });

    await screen.getByRole('button', { name: 'Edit literal value' }).click();

    expect(stack.current?.title).toBe('Configure Literal Value');
    expect(stack.current?.draft).toBe(20);
});

test('edits a getter value for a setter effect', async () => {
    const stack = createContextStack();
    const valueGetter = { type: 'getter', in: 'temp-variable', variable: 'damage' } as const;
    const screen = await render(FormEffect, {
        stack,
        value: { ...setterEffect, value: valueGetter }
    });

    await expect.element(screen.getByTestId('input-effect-value-kind')).toHaveValue('getter');
    await screen.getByRole('button', { name: 'Edit value getter' }).click();

    expect(stack.current?.title).toBe('Configure Value Getter');
    expect(stack.current?.draft).toEqual(valueGetter);
});

test('renders only one getter editor at a time for move effects', async () => {
    const stack = createContextStack();
    const screen = await render(FormEffect, { stack, value: moveEffect });

    await expect.element(screen.getByRole('button', { name: 'Edit character to move' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Edit destination' })).toBeVisible();

    await screen.getByRole('button', { name: 'Edit character to move' }).click();
    expect(stack.current?.title).toBe('Configure Character to Move');
    expect(stack.current?.draft).toEqual(moveEffect.moveId);

    stack.current?.cancel();
    await screen.getByRole('button', { name: 'Edit destination' }).click();
    expect(stack.current?.title).toBe('Configure Destination');
    expect(stack.current?.draft).toEqual(moveEffect.toId);
});

test('opens conditional effect editors from the main effect form', async () => {
    const conditionalEffect: EffectFomAction = {
        type: 'conditional',
        conditions: [],
        onTrue: [],
        onFalse: []
    };
    const stack = createContextStack();
    const screen = await render(FormEffect, { stack, value: conditionalEffect });

    await screen.getByRole('button', { name: /Configure conditions/ }).click();

    expect(stack.current?.title).toBe('Configure Conditions');
    expect(stack.current?.draft).toEqual([]);
});
for(const effectName of ['Move','Event','Conditional','Set variable','Start dialogue']){
    test(`fail on not passed data on ${effectName}`,async ()=>{
        const onAfterSubmit = vi.fn();
        const screen = await render(FormEffect, {stack: createContextStack(), onAfterSubmit});
        await screen.getByTestId('input-effect-type').selectOptions(effectName);
        await screen.getByRole('button', { name: 'Confirm' }).click();
        await expect.poll(() => onAfterSubmit.mock.calls.length).toBe(0);
    })

}
