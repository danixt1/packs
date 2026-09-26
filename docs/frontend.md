# Frontend system

## Basic layout informations

- The declaration of CSS variables are in the [main layout](../src/routes/+layout.svelte).
- Currently all pages is uses in top the [TopBar](../src/lib/components/TopBar.svelte) component.

## Notifications system

- The user can receive notifications while in the site. to do that use [notify.ts](../src/lib/notify.ts).
- have three options to use, in case of: success, failed or information.

## Inputs

All components inputs used in `src/routes` are localized in the folder `src/lib/components/inputs`.
All inputs SHOULD have pass a `id` variable.
About Some Inputs:

InputCard.svelte:
- used when the user can select a array of options, the options are showed as cards who the user can select.
- The selectable items are passed in `items` vars where every item is a object with `title` and `value`.
