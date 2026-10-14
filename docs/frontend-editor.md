# Editor components

The editor is built from reusable components that create and modify the data declared in [`declarative.d.ts`](../src/lib/types/data/declarative.d.ts). Editor routes own the data being edited and compose the reusable components needed to display and update it.

The current editor flow is based on components in `components/lists` and `components/forms`. The old `formPopupFlow` architecture is no longer part of the current design and should not be used for new code. The remaining components in `components/editor` are button components that are still used by editor routes and are kept there for convenience.

## Lists

List components manage collections of editor data and provide the list-level actions for creating, editing, deleting, and, when applicable, reordering entries.

- [`ListVars.svelte`](../src/lib/components/lists/ListVars.svelte) displays variables in an [`ObjectTable.svelte`](../src/lib/components/ObjectTable.svelte), supports editing and deleting variables, and can open [`FormVar.svelte`](../src/lib/components/forms/FormVar.svelte) to create or edit a variable.
- [`ListConditions.svelte`](../src/lib/components/lists/ListConditions.svelte) manages conditional-expression tokens, supports adding condition tokens, validates changes, and uses [`OrderedList.svelte`](../src/lib/components/lists/OrderedList.svelte) for editing, deleting, and drag-and-drop reordering.
- [`OrderedList.svelte`](../src/lib/components/lists/OrderedList.svelte) is a generic ordered list. It accepts a label function and optional edit/delete callbacks. `validateChange` can reject a removal or reorder, and `onInvalidChange` reports the rejected change.

List components accept `values` with Svelte binding when the parent owns the collection. They may also receive callbacks such as `onEdit`, `onCancel`, `onAfterSubmit`, and `onCreatePressed` when the parent needs to control the editing flow itself.

## Forms

Forms are reusable editors for individual data values. Each form can render standalone inside [`Form.svelte`](../src/lib/components/Form.svelte), or render only its inputs when the parent supplies `writeFormPropsTo`.

- [`FormVar.svelte`](../src/lib/components/forms/FormVar.svelte) creates or edits a variable. It validates names, prevents spaces, prevents duplicate names, and can automatically insert or update the variable in an object with a `vars` property through `autoAttach`.
- [`FormCondition.svelte`](../src/lib/components/forms/FormCondition.svelte) creates relational, exists, and is-valid conditions. Relational conditions use left and right operands; the other condition types use `variableToCheck`. An operand can be a literal value or a getter.
- [`FormGetter.svelte`](../src/lib/components/forms/FormGetter.svelte) creates getter declarations for target objects, runtime objects, or temporary slots. It supports variable and metadata lookups and optional fallback values.
- [`FormValue.svelte`](../src/lib/components/forms/FormValue.svelte) edits primitive string, number, and boolean values.

Forms use `autoAttach` and `attachTo` when a generated value should be written directly into a parent object. For example, `FormCondition` can write the generated condition to the property named by `attachTo`. `onAfterSubmit` remains available when the parent also needs to react to a completed submission.

When a form is nested inside another form, `writeFormPropsTo` exposes the current form's `onSubmit` and `onCancel` callbacks to the parent. This allows the parent to render the nested form's inputs while retaining control over the submission flow.

## `Form.svelte`

[`Form.svelte`](../src/lib/components/Form.svelte) is the shared standalone form wrapper. It:

- prevents the browser's default submit behavior;
- calls the supplied `onSubmit` callback when the user confirms;
- renders a Cancel button only when `onCancel` is provided; and
- renders the form's child inputs through a Svelte snippet.

Use it when a form component owns its submit and cancel actions. Use `writeFormPropsTo` instead when the form is embedded in another editor flow and the parent owns the surrounding form actions.

## `PageSwitch`

[`pageSwitch.ts`](../src/lib/shared/pageSwitch.ts) provides a small state manager for editor views where only one page should be visible at a time. A parent creates a `PageSwitch`, and a list or form creates a child switch with `createSwitch()`.

Important behavior:

- `enablePage()` activates a child switch and disables the previously active switch.
- `isPageEnabled` controls which page the component renders.
- `localData` stores data belonging to that switch and is exposed as `PageSwitch.data` when the switch is active.
- `createSwitch()` registers the child switch and automatically activates the first switch created.
- `remove()` unregisters a child switch when its component is destroyed.
- `activeSwitch`, `getActiveSwitch()`, and `enableSwitchByName()` can be used when a parent needs to inspect or activate a specific page.

`ListVars` and `ListConditions` use a child switch to alternate between their list view and their corresponding form. A parent route can pass the same `PageSwitch` to coordinate that editor with other pages.

## Remaining components in `components/editor`

The `components/editor` folder is still used for reusable editor buttons:

- [`ButtonEditorCreate.svelte`](../src/lib/components/editor/ButtonEditorCreate.svelte) renders a centered create button and calls `onClick`.
- [`ButtonPopUp.svelte`](../src/lib/components/editor/ButtonPopUp.svelte) renders a full-width button and calls `onclick`.

These button components do not define forms or use `formPopupFlow`. The other former editor components that depended on `formPopupFlow` are legacy code and should not be used as examples for new editor work.

## `ObjectTable.svelte`

[`ObjectTable.svelte`](../src/lib/components/ObjectTable.svelte) displays tabular data with Edit and Delete actions. It has two data representations:

- `items` is the normalized view data. It contains the properties and values prepared specifically for display in the table.
- `ref` is optional raw data. It contains the original objects before normalization.

When `ref` is provided, `ObjectTable` **always** passes `ref[index]` to both `onEdit` and `onDelete`. It does not pass the normalized `items[index]` in that case. Therefore, `ref` must have the same item count and the same ordering as `items`; each `ref[index]` must correspond to `items[index]`.

Use `items` for presentation and `ref` when callbacks need to modify or inspect the original data. If no raw representation is needed, omit `ref`; callbacks then receive the corresponding normalized item from `items`.