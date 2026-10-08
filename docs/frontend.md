# Frontend system

## Basic layout information

- CSS variables are declared in the [main layout](../src/routes/+layout.svelte).
- The basic structure of every page contains:
  - `Notification.svelte`, which displays temporary notification pop-ups.
  - `TopBar.svelte`, the main navigation bar.

## Notification system

- Use [notify.ts](../src/lib/notify.ts) to display notifications to the user.
- Notifications have three types: success, error, and information.
- The main notification component is `Notification.svelte`, which is loaded by [+layout.svelte](../src/routes/+layout.svelte).

## Global CSS classes

The [main layout](../src/routes/+layout.svelte) declares several global classes with `:global(...)`. These classes can be used by any component or route:

- `.def-input`: Standard styling for text, number, and textarea inputs. It sets `box-sizing`, full width, border, rounded corners, padding, text color, background color, and inherited font settings.
- `.def-input:focus`: Adds an accent-colored outline when an input receives focus. The outline is offset from the element to improve visibility.
- `.def-label`: Applies bold text to labels used with inputs and other form controls.
- `.form-group`: Provides the standard form layout. It uses a vertical flex layout, adds a small gap between children, and applies padding around the group.

## Inputs

All reusable input components are located in `src/lib/components/inputs`.
The folder's `index.ts` file re-exports the components, so they can be imported together:

```ts
import { InputCard, InputNumber, InputSelect, InputSwitch, InputText, InputTextArea } from "$lib/components/inputs";
```

All input components support the optional `wrapDiv` prop. When it is `true`, the component is wrapped in a `<div class="form-group">`, which applies the standard spacing. Set it to `false` when the component is already inside a `.form-group` or requires a custom layout.

### Input components

The following interfaces describe the props accepted by each input component. Props declared with `$bindable()` should normally be used with Svelte's `bind:` syntax.

```ts
// BaseInput.svelte: shared internal wrapper used by the other input components.
interface BaseInput {
    id: string;                 // Unique input ID, used to associate the input with its label.
    label?: string;             // Optional label text.
    wrapDiv?: boolean;          // Wraps the input in a .form-group when true.
    children: Snippet;          // Content rendered inside the wrapper.
}

// InputText.svelte: single-line text input.
interface InputTextProps extends BaseInput {
    name?: string;
    value: string;              // Bindable input value.
    required?: boolean;
    minlength?: number;
    maxlength?: number;
    autocomplete?: FullAutoFill;
}

// InputTextArea.svelte: multi-line text input.
interface InputTextAreaProps extends BaseInput {
    name?: string;
    value?: string;             // Bindable input value; defaults to an empty value.
    required?: boolean;
    minlength?: number;
    maxlength?: number;
}

// InputNumber.svelte: numeric input.
interface InputNumberProps extends BaseInput {
    name?: string;
    value: number;              // Bindable numeric value.
    required?: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
}

// InputSelect.svelte: select input for choosing one option.
interface InputSelectProps extends BaseInput {
    label: string;
    items: { value: string; title: string }[];
    selected: string;           // Bindable selected value.
    disabled?: boolean;
}

// InputCard.svelte: selectable cards for choosing zero or more options.
// Use InputSelect when the user must choose only one option.
interface InputCardProps extends BaseInput {
    label: string;
    items: { value: string; title: string }[];
    selectedItems: string[];    // Bindable selected values; defaults to an empty array when absent.
    onChange?: (value: string, isChecked: boolean) => void;
}

// InputSwitch.svelte: switch for a Boolean value, such as on/off settings.
interface InputSwitchProps extends BaseInput {
    value: boolean;             // Bindable Boolean value.
}
```

`InputCard` calls `onChange` whenever an item is selected or unselected. The callback receives the item's `value` and a Boolean indicating whether the item is now selected.

## Editor Components

Editor Components are complexy objects who generally generate some structure declared in declarative.d.ts the editor route have the object to create/modify and view generated worlds.

the general data of these components are in [frontend-editor.md](./frontend-editor.md).