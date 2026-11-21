import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ContextMembershipInput from './ContextMembershipInput.svelte';
import type { ContextEditing } from '$lib/types/data/editor';

const contexts: ContextEditing[] = [
    { name: 'world', title: 'World', description: '', parent: null, varsAllowed: [], objectsInCtx: {} },
    { name: 'battle', title: 'Battle', description: '', parent: 'world', varsAllowed: [], objectsInCtx: {} }
];

test('shows existing nested membership and reports updated full context paths', async () => {
    const onchange = vi.fn();
    const screen = await render(ContextMembershipInput, {
        id: 'entity-contexts',
        contexts,
        value: ['world.battle'],
        onchange
    });

    const battleCheckbox = screen.getByRole('checkbox', { name: /Battle/ });
    await expect.element(battleCheckbox).toBeChecked();
    await battleCheckbox.click();

    expect(onchange).toHaveBeenCalledWith([]);
});

test('only offers contexts that apply to the field type', async () => {
    const screen = await render(ContextMembershipInput, {
        id: 'object-contexts',
        contexts: [
            { name: 'objects', description: '', parent: null, appliesTo: 'objects', varsAllowed: [], objectsInCtx: {} },
            { name: 'variables', description: '', parent: null, appliesTo: 'variables', varsAllowed: [], objectsInCtx: {} }
        ],
        value: [],
        appliesTo: 'objects'
    });

    await expect.element(screen.getByRole('checkbox', { name: /objects/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('checkbox', { name: /variables/i })).not.toBeInTheDocument();
});
