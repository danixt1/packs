# Editor components

The editor is built from reusable components that create and modify the data declared in [`declarative.d.ts`](../src/lib/types/data/declarative.d.ts). Editor routes own the data being edited and compose the reusable components needed to display and update it.

The current editor flow is based on the **ContextStack** architecture (`components/lists`, `components/forms`, and `ContextHost.svelte`). The old `PageSwitch` and legacy `formPopupFlow` state models have been replaced by recursive, promise-based stack navigation. The remaining components in `components/editor` are button components that are still used by editor routes and are kept there for convenience.

## ContextStack Architecture

The editor uses [`contextStack.svelte.ts`](../src/lib/shared/contextStack.svelte.ts) and [`ContextHost.svelte`](../src/lib/components/ContextHost.svelte) to handle multi-depth, recursive editing workflows (e.g. `Action -> Targets -> Target -> Conditions -> Relational -> Getter`).

### Key Concepts

1. **Monotonic Frame Identifiers**:
   - Frames are assigned sequential IDs (`frame_1`, `frame_2`, ...) rather than titles or type names.
   - This ensures recursion-safety: recursive components like `FormEffect` (`Effect -> Conditional -> onTrue -> Effect`) can nest arbitrarily deep with zero key or state collisions.
2. **Self-Rendering Frames (`render: Snippet`)**:
   - When a caller pushes a frame via `stack.push({ title, data, render: snippet, meta })`, it specifies the Svelte snippet that renders the frame.
   - Eliminates fragile `stack.depth === 1` checks in parent containers.
3. **DOM Preservation & Zero Remounting**:
   - `ContextHost.svelte` renders all stacked frames simultaneously. Ancestor frames are styled with `display: none !important`, while the active frame is visible.
   - Ancestor component states, uncommitted form inputs, scroll positions, and focus are preserved across navigation without unmounting.
4. **Isolated I/O Boundaries**:
   - Both input on `push()` and output on `resolve()` are processed through `deepSnapshot()` (structured cloning), preventing proxy leakage and accidental mutations of parent state before confirmation.
   - Cancelling a frame discards changes cleanly with zero side-effects (`await stack.push()` returns `null`).
5. **Breadcrumb Navigation**:
   - `ContextHost.svelte` provides automatic breadcrumbs with `aria-current="location"`.
   - Users can jump directly back to ancestor frames via `stack.jumpTo(frameId)`.
6. **Modal State**:
   - The editor `<Popup>` is driven directly by the stack: `open={stack.depth > 0}` and `onClose={() => stack.reset()}`.

## Lists

List components manage collections of editor data and provide the list-level actions for creating, editing, deleting, and, when applicable, reordering entries.

- [`ListVars.svelte`](../src/lib/components/lists/ListVars.svelte) displays variables in an [`ObjectTable.svelte`](../src/lib/components/ObjectTable.svelte), supports editing and deleting variables, and pushes `FormVar.svelte` frames onto `stack` for creating and editing variables.
- [`ListConditions.svelte`](../src/lib/components/lists/ListConditions.svelte) manages conditional-expression tokens, supports adding condition tokens, validates changes, uses [`OrderedList.svelte`](../src/lib/components/lists/OrderedList.svelte) for reordering and deletion, and pushes `FormCondition.svelte` frames onto `stack`.
- [`ListCollectors.svelte`](../src/lib/components/lists/ListCollectors.svelte) manages target collectors, displays items via `OrderedList.svelte`, and pushes `FormCollector.svelte` frames onto `stack`.
- [`ListEffects.svelte`](../src/lib/components/lists/ListEffects.svelte) manages action and node effects, supports reordering, and pushes `FormEffect.svelte` frames onto `stack`.
- [`OrderedList.svelte`](../src/lib/components/lists/OrderedList.svelte) is a generic ordered list. It accepts a label function and optional edit/delete callbacks. `validateChange` can reject a removal or reorder, and `onInvalidChange` reports the rejected change.

List components accept `values` with Svelte binding when the parent owns the collection, and accept `stack` (`ContextStack`) to handle child form opening without coupling to parent routes.

## Forms

Forms are reusable editors for individual data values. Under the ContextStack pattern, each form binds to the active frame's `draft` and receives explicit `onCancel` (calling `frame.cancel()`) and `onAfterSubmit` (calling `frame.resolve(result)`).

- [`FormVar.svelte`](../src/lib/components/forms/FormVar.svelte) creates or edits a variable. It validates names, prevents spaces, prevents duplicate names (checking against `existingNames`), and supports primitive string, number, and boolean values.
- [`FormCondition.svelte`](../src/lib/components/forms/FormCondition.svelte) creates relational, exists, and is-valid conditions. Relational conditions use left and right operands; other condition types use `variableToCheck`. Operands can push nested operand frames (`getter` vs `literal value`).
- [`FormGetter.svelte`](../src/lib/components/forms/FormGetter.svelte) creates getter declarations for target objects, runtime objects, or temporary slots. It supports variable and metadata lookups and optional fallback values.
- [`FormValue.svelte`](../src/lib/components/forms/FormValue.svelte) edits primitive string, number, and boolean values.
- [`FormCollector.svelte`](../src/lib/components/forms/FormCollector.svelte) configures character, place, item, self, and connected places collectors, pushing nested condition lists or getter forms onto `stack`.
- [`FormEffect.svelte`](../src/lib/components/forms/FormEffect.svelte) configures move, event, conditional, setter, and dialogue start effects, supporting recursion for nested conditional branches.

## `Form.svelte`

[`Form.svelte`](../src/lib/components/Form.svelte) is the shared form wrapper. It:

- prevents the browser's default submit behavior;
- calls the supplied `onSubmit` callback when the user confirms;
- renders a Cancel button only when `onCancel` is provided; and
- renders the form's child inputs through a Svelte snippet.

## Remaining components in `components/editor`

The `components/editor` folder is still used for reusable editor buttons:

- [`ButtonEditorCreate.svelte`](../src/lib/components/editor/ButtonEditorCreate.svelte) renders a centered create button and calls `onClick`.
- [`ButtonPopUp.svelte`](../src/lib/components/editor/ButtonPopUp.svelte) renders a full-width button and calls `onclick`.

These button components do not define forms or use legacy page managers.

## `ObjectTable.svelte`

[`ObjectTable.svelte`](../src/lib/components/ObjectTable.svelte) displays tabular data with Edit and Delete actions. It has two data representations:

- `items` is the normalized view data. It contains the properties and values prepared specifically for display in the table.
- `ref` is optional raw data. It contains the original objects before normalization.

When `ref` is provided, `ObjectTable` **always** passes `ref[index]` to both `onEdit` and `onDelete`. It does not pass the normalized `items[index]` in that case. Therefore, `ref` must have the same item count and the same ordering as `items`; each `ref[index]` must correspond to `items[index]`.

Use `items` for presentation and `ref` when callbacks need to modify or inspect the original data. If no raw representation is needed, omit `ref`; callbacks then receive the corresponding normalized item from `items`.