import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListVars from './ListVars.svelte';
import { createContextStack } from '$lib/shared/contextStack.svelte';
import { WorldEditor } from '$lib/shared/worldEditor';

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

test('ListVars shows only variables allowed by the selected variable contexts', async () => {
    const editor = new WorldEditor({
        name: 'test-world',
        description: '',
        version: [1, 0, 0],
        characters: [],
        places: [],
        items: [],
        actions: [],
        vars: [],
        textTemplates: []
    });
    editor.addContext({
        name: 'combat',
        description: '',
        parent: null,
        appliesTo: 'variables',
        varsAllowed: ['health'],
        objectsInCtx: {}
    });
    editor.setCurrentContexts(editor.getContexts());

    const screen = await render(ListVars, {
        values: [
            { name: 'health', type: 'number', value: 10 },
            { name: 'social', type: 'number', value: 3 }
        ],
        contextEditor: editor
    });

    await expect.element(screen.getByText('health')).toBeVisible();
    await expect.element(screen.getByText('social')).not.toBeInTheDocument();
});
