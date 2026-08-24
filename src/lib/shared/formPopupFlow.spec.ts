import { expect, it, vi } from 'vitest';
import { createFormPopupFlow } from './formPopupFlow';

type TestForm = 'character' | 'label' | 'variable';

function buildFlow(labelResult: 'back' | 'stay' = 'back') {
    const submitLabel = vi.fn(() => labelResult);
    const flow = createFormPopupFlow<TestForm>('character', {
        character: { title: 'Create Character' },
        label: { title: 'New Label', parent: 'character', onSubmit: submitLabel },
        variable: { title: 'New Variable', parent: 'character' }
    });

    return { flow, submitLabel };
}

it('opens the root form and exposes its title', () => {
    const { flow } = buildFlow();

    flow.open();

    expect(flow.isOpen).toBe(true);
    expect(flow.activeForm).toBe('character');
    expect(flow.title).toBe('Create Character');
});

it('enters a child form and restores its parent when cancelled or dismissed', () => {
    const { flow } = buildFlow();
    flow.open();
    flow.enter('label');

    expect(flow.activeForm).toBe('label');
    expect(flow.title).toBe('New Label');

    flow.cancel();
    expect(flow.activeForm).toBe('character');
    expect(flow.isOpen).toBe(true);

    flow.enter('variable');
    flow.dismiss();
    expect(flow.activeForm).toBe('character');
});

it('returns to the parent after a child form submits successfully', () => {
    const { flow, submitLabel } = buildFlow();
    flow.open();
    flow.enter('label');
    flow.submit();

    expect(submitLabel).toHaveBeenCalledOnce();
    expect(flow.activeForm).toBe('character');
    expect(flow.isOpen).toBe(true);
});

it('keeps the current form open when its submit handler returns stay', () => {
    const { flow } = buildFlow('stay');
    flow.open();
    flow.enter('label');
    flow.submit();

    expect(flow.activeForm).toBe('label');
    expect(flow.isOpen).toBe(true);
});

it('closes when the root form is dismissed', () => {
    const { flow } = buildFlow();
    flow.open();
    flow.dismiss();

    expect(flow.isOpen).toBe(false);
    expect(flow.activeForm).toBe('character');
});
