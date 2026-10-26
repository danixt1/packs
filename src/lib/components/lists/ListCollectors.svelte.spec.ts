import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListCollectorsTestHarness from './__tests__/ListCollectorsTestHarness.svelte';

test('edits the current collector and keeps its added condition after remounting', async () => {
    const screen = await render(ListCollectorsTestHarness);
    //Collector
    await screen.getByRole('button', { name: 'Edit', exact: true }).first().click();
    //Collector > Condition
    await screen.getByRole('button', { name: 'Add Condition' }).click();
    //Collector > Condition > operator left
    await screen.getByTestId('input-condition-type').selectOptions('condition-relational');
    await screen.getByRole('button', { name: 'left' }).click();
    await screen.getByTestId('input-radio-operand-mode-value').click();
    await screen.getByTestId('input-value-string').fill('door');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    // Collector > Condition > operator right
    await screen.getByTestId('input-condition-type').selectOptions('condition-relational');
    await screen.getByRole('button', { name: 'right' }).click();
    await screen.getByTestId('input-radio-operand-mode-value').click();
    await screen.getByTestId('input-value-string').fill('open');
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await screen.getByRole('button', { name: 'Confirm' }).click();
    await screen.getByRole('button', { name: 'Confirm' }).click();

    await expect.element(screen.getByTestId('collector-count')).toHaveTextContent('1');
    await expect.element(screen.getByTestId('condition-count')).toHaveTextContent('1');
    await expect.element(screen.getByText('Collect place')).toBeVisible();

    //Click again in the first element to edit
    await screen.getByRole('button', { name: 'Edit', exact: true }).first().click();
    //Click Edit from the condition
    await screen.getByRole('button', { name: 'Edit', exact: true }).last().click();
    await expect.element(screen.getByRole('button', { name: '"door"' }).first()).toBeVisible();

    await screen.getByRole('button', { name: 'Remount collector editor' }).click();
    await expect.element(screen.getByTestId('collector-count')).toHaveTextContent('1');
    await expect.element(screen.getByTestId('condition-count')).toHaveTextContent('1');
});
