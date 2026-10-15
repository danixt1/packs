---
name: route-editor-form-safety
description: 'Use automatically when editing, fixing, creating, or reviewing a form in the StoryEngine route editor, including Svelte form components, editor routes, list editors, nested forms, ContextStack flows, bindable values, and form input IDs. Inspect likely state, remount, serialization, accessibility, and duplicate-ID bugs before implementation and validate the complete editor flow.'
user-invocable: false
disable-model-invocation: false
---

# Route Editor Form Safety

## Purpose

Apply this workflow whenever work touches a form used by the route editor. The goal is to find likely UI and state bugs before changing code, especially bugs that only appear when a form is opened through a list, nested frame, or recursive component rather than rendered directly.

For reported bugs, use a test-first workflow: build the smallest focused test that reproduces the reported behavior, confirm that it fails, and only then change the implementation. Keep the test as regression coverage after the fix.

## Scope

Use for work involving:

- `src/routes/editor/**/*.svelte`
- `src/lib/components/forms/**/*.svelte`
- `src/lib/components/lists/**/*.svelte`
- shared editor controls such as `Form.svelte`, `Popup.svelte`, `ObjectTable.svelte`, `ContextHost.svelte`, `contextStack.svelte.ts`, and reusable inputs
- form tests, editor data hydration, serialized editor data, or nested submit/cancel flows

## Workflow

### 1. Build a failing reproduction first

Before changing implementation code:

1. Identify the exact user flow, input values, route, and expected result from the report.
2. Add the smallest focused test that exercises the reported behavior. Prefer the real list, route, or `ContextStack` flow when the bug involves navigation, mounting, or nested forms; use a direct form test only when the behavior is isolated to the form.
3. Run the focused test and confirm that it fails for the reported reason. Record the actual DOM/state/output and the expected result.
4. Only after the failure is reproduced, investigate and implement the fix. Do not make a speculative implementation change and then create a test that merely matches it.

If the available information is not enough to reproduce the error or construct a meaningful test, stop before changing implementation code and ask the user whether they can provide the exact input that was passed. Also request the route, steps to reproduce, expected result, and serialized fixture or screenshot when relevant. Do not guess at missing input data.

### 2. Establish the editor data flow

Before changing implementation code:

1. Read `AGENTS.md`.
2. Read the relevant document in `docs/` (specifically `docs/frontend-editor.md`).
3. Identify the owner of the edited value and trace the complete path:
   `route state -> ContextStack.push -> list editor -> form -> nested form -> resolve/cancel -> parent draft -> route state`.
4. Inspect the declared data type and compare it with the form's temporary editing model.
5. Verify whether the frame uses self-rendering snippets (`render: snippet`) and monotonic frame IDs rather than hardcoded depth checks or string names.

### 3. Check common failure modes

Look specifically for these risks:

#### State loss during navigation and unmounting

- In `ContextHost.svelte`, frames are kept mounted simultaneously and ancestor frames are styled with `display: none !important`.
- **Never unmount** ancestor frames using conditional `{#if stack.depth === ...}` branching in hosts or pages. Unmounting wipes out temporary focus, uncommitted inputs, and scroll position.
- Components pushing frames must provide their own `render` snippet to `stack.push({ render: mySnippet })`.

#### Collection ownership and stale local copies

- A list component must not mutate parent arrays directly without resolving through the stack frame.
- Prefer pushing create/edit frames via `stack.push(...)` and only updating the collection when the promise resolves with confirmed data.
- Cancelling must pop cleanly (`frame.cancel()`), returning `null` with zero side effects on the parent array.

#### Collision handling during Edit vs. Create

- In **Create mode**, validate that the entered ID does not exist in `meta.existingIds`.
- In **Edit mode**, pass `existingIds` filtered to exclude the item's own ID (`filter((_, i) => i !== index)`), allowing an object to keep its own ID while preventing renaming collisions with other existing objects.

#### Hydration and serialization mismatches

- Existing serialized properties must be deep-cloned into temporary form drafts using `deepSnapshot()` / `structuredClone()`.
- Getter objects must not be mistaken for literal values.
- Optional properties must not become empty objects or empty strings unintentionally.
- `undefined`, temporary editor metadata, and UI-only fields (`_baseOID`, `_categoriesText`) must be removed before saving to world storage.
- Test both loading an existing object and submitting it without changes. Compare the result with the original serialized shape.

#### Duplicate DOM IDs in recursive editors

- Components like `FormEffect` can nest recursively (`Effect -> Conditional -> onTrue -> Effect`).
- Derive input IDs or test IDs using stable frame identifiers (`${frame.id}-my-field`) or prefixing to ensure 100% DOM uniqueness.
- Verify uniqueness with the browser DOM, not only source inspection.

#### Reactive object and proxy isolation

- `$state.snapshot()` / `deepSnapshot()` must be taken at the boundaries (`stack.push` entry and `frame.resolve` exit) to prevent raw object or proxy leakage.
- Never mutate a parent draft directly while a child frame is active.

#### Accessibility and input behavior

- A label must be associated with the control it describes.
- Buttons that change editor state must have `type="button"`.
- Breadcrumb trails rendered by `ContextHost` must provide accessible landmarks (`nav aria-label="Editor breadcrumbs"` and `aria-current="location"` on the active crumb).

### 4. Reproduce the real route flow

After the failing test identifies the state transition, confirm the behavior through the actual route when possible:

1. Start the dev server if needed.
2. Open the relevant hash route.
3. Create or open the parent object.
4. Navigate through the same list and nested frame controls a user uses.
5. Inspect the DOM values and IDs after every stack push and pop.
6. Submit without editing, then edit one field and submit again.
7. Repeat with Cancel and reopen.

Temporary `console.log` statements, browser inspection, and temporary test fixtures are allowed during diagnosis, but remove diagnostics and throwaway files before finishing.

### 5. Keep regression coverage at the right level

Keep the failing reproduction as a regression test and add the smallest useful combination of tests:

- **Stack unit test (`contextStack.svelte.spec.ts`):** verifies push, pop, resolve, cancel, breadcrumb jumps, and snapshot isolation.
- **Component harness test (`ContextStackTestHarness.svelte.spec.ts`):** verifies Create, Edit, ID collision checks, cancel discards, and self-rendering frames.
- **Form / list test:** verifies adding, editing, and deleting items update the parent collection cleanly.
- **DOM uniqueness assertion:** verifies IDs and test IDs are unique when repeated or recursive fields are rendered.

### 6. Validate before completion

Run:

1. `npm run check`
2. The focused form/editor test file
3. `npm test`
4. `npm run build` when route or build behavior changed
5. `git diff --check`

Review the final diff for temporary logging, debug fields, duplicate IDs, accidental serialized metadata, and unrelated changes. Report pre-existing warnings separately from new errors.

## Completion Criteria

The work is complete only when:

- existing values load correctly through the real editor route;
- repeated controls have unique IDs and accessible labels;
- submit and cancel work from both parent and nested editor states;
- serialized output contains the intended data and no UI-only fields;
- regression tests cover the failure path;
- checks and tests pass, or remaining failures are explicitly documented.
