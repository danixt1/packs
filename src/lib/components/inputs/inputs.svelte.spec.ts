import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InputCard from './InputCard.svelte';
import InputNumber from './InputNumber.svelte';
import InputSelect from './InputSelect.svelte';
import InputSwitch from './InputSwitch.svelte';
import InputText from './InputText.svelte';
import InputTextArea from './InputTextArea.svelte';

test('uses the input id to generate a test id and wraps its label', async () => {
    const screen = await render(InputText, {
        id: 'name',
        label: 'Name',
        value: ''
    });

    await expect.element(screen.getByTestId('input-name')).toHaveAttribute('id', 'name');
    await expect.element(screen.getByRole('textbox', { name: 'Name' })).toBeVisible();
});

test('generates test ids for the other input controls', async () => {
    const textArea = await render(InputTextArea, {
        id: 'description',
        label: 'Description',
        value: ''
    });
    await expect.element(textArea.getByTestId('input-description')).toBeVisible();

    const number = await render(InputNumber, {
        id: 'amount',
        label: 'Amount',
        value: 0
    });
    await expect.element(number.getByTestId('input-amount')).toBeVisible();

    const select = await render(InputSelect, {
        id: 'type',
        label: 'Type',
        items: [{ value: 'text', title: 'Text' }],
        selected: 'text'
    });
    await expect.element(select.getByTestId('input-type')).toBeVisible();
    await expect.element(select.getByRole('combobox', { name: 'Type' })).toBeVisible();

    const toggle = await render(InputSwitch, {
        id: 'enabled',
        label: 'Enabled',
        value: false
    });
    await expect.element(toggle.getByTestId('input-enabled')).toBeVisible();
    await expect.element(toggle.getByRole('switch', { name: 'Enabled' })).toBeVisible();
});

test('generates a test id for card inputs and wraps each option label', async () => {
    const screen = await render(InputCard, {
        id: 'labels',
        label: 'Labels',
        items: [{ value: 'important', title: 'Important' }],
        selectedItems: []
    });

    await expect.element(screen.getByTestId('input-labels')).toBeVisible();
    await expect.element(screen.getByRole('checkbox', { name: 'Important' })).toBeInTheDocument();
});