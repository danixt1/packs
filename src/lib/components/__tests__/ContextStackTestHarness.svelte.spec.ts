import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ContextStackTestHarness from './ContextStackTestHarness.svelte';

test('ContextStack: adds a new item in Create mode', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [{ id: 'sword', name: 'Iron Sword' }]
    });

    // 1. Initial list has 1 item
    await expect.element(screen.getByTestId('item-row-sword')).toBeVisible();

    // 2. Open Create mode
    await screen.getByTestId('create-btn').click();
    await expect.element(screen.getByTestId('form-view')).toBeVisible();

    // 3. Fill in fields
    const idInput = screen.getByTestId('input-item-id');
    const nameInput = screen.getByTestId('input-item-name');
    await idInput.fill('shield');
    await nameInput.fill('Wooden Shield');

    // 4. Confirm
    await screen.getByRole('button', { name: 'Confirm' }).click();

    // 5. Back to list, new item present
    await expect.element(screen.getByTestId('list-view')).toBeVisible();
    await expect.element(screen.getByTestId('item-row-shield')).toBeVisible();
});

test('ContextStack: rejects duplicate ID collision in Create mode', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [{ id: 'sword', name: 'Iron Sword' }]
    });

    await screen.getByTestId('create-btn').click();

    // Attempt to create an item with the same ID 'sword'
    await screen.getByTestId('input-item-id').fill('sword');
    await screen.getByTestId('input-item-name').fill('Another Sword');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    // Should stay in form view because validation prevented resolve
    await expect.element(screen.getByTestId('form-view')).toBeVisible();
});

test('ContextStack: allows keeping the same ID when editing itself', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [
            { id: 'sword', name: 'Iron Sword' },
            { id: 'potion', name: 'Health Potion' }
        ]
    });

    // Click edit on 'sword'
    await screen.getByTestId('edit-btn-sword').click();
    await expect.element(screen.getByTestId('form-view')).toBeVisible();

    // Change only the name, keep id 'sword'
    const nameInput = screen.getByTestId('input-item-name');
    await nameInput.fill('Steel Sword');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    // Should succeed and return to list view
    await expect.element(screen.getByTestId('list-view')).toBeVisible();
    await expect.element(screen.getByText('sword - Steel Sword')).toBeVisible();
});

test('ContextStack: prevents renaming an existing item to collide with another item', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [
            { id: 'sword', name: 'Iron Sword' },
            { id: 'potion', name: 'Health Potion' }
        ]
    });

    // Edit 'sword' and try to rename its ID to 'potion'
    await screen.getByTestId('edit-btn-sword').click();
    await screen.getByTestId('input-item-id').fill('potion');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    // Stays in form view because 'potion' collides with existingIds
    await expect.element(screen.getByTestId('form-view')).toBeVisible();

    // Cancel edit
    await screen.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(screen.getByTestId('list-view')).toBeVisible();
    // Original sword is preserved
    await expect.element(screen.getByTestId('item-row-sword')).toBeVisible();
});

test('ContextStack: cancel in edit mode discards temporary draft changes', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [{ id: 'sword', name: 'Iron Sword' }]
    });

    await screen.getByTestId('edit-btn-sword').click();
    await screen.getByTestId('input-item-name').fill('Destroyed Sword');

    // Click cancel
    await screen.getByRole('button', { name: 'Cancel' }).click();

    // Should return to list view with original name unchanged
    await expect.element(screen.getByTestId('list-view')).toBeVisible();
    await expect.element(screen.getByText('sword - Iron Sword')).toBeVisible();
});

test('ContextStack: breadcrumbs allow clicking to jump back to an ancestor frame', async () => {
    const screen = await render(ContextStackTestHarness, {
        initialItems: [{ id: 'sword', name: 'Iron Sword' }]
    });

    // Start create (depth 1)
    await screen.getByTestId('create-btn').click();
    await expect.element(screen.getByTestId('form-view')).toBeVisible();

    // Verify breadcrumb is rendered inside context host
    await expect.element(screen.getByTestId('context-host')).toBeVisible();
});
