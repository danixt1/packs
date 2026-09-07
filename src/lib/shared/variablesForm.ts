import type { FormPopupFlow, FormPopupTransition } from './formPopupFlow';
import type { VariableDeclarator } from '$lib/types/data/declarative';
import { showError } from '$lib/notify';

/**
 * Returns the title for the "variable" form, depending on whether a variable is
 * being edited (an allocation reference was set on the parent object) or created.
 *
 * The `_varRef` marker is written onto the parent object's data by `VarList`
 * before it enters the variable form, so we read it from the parent panel.
 */
export function variableTitle(
    formFlow: FormPopupFlow<string>,
    parentFormId: string
): string {
    return formFlow.getDataFromPanel(parentFormId)?._varRef
        ? 'Editing Variable'
        : 'Create Variable';
}

/**
 * Writes the current variable form data back into the parent object's `vars`
 * array, either replacing an existing variable (when `_varRef` is set) or
 * appending a new one.
 *
 * All `vars`-capable objects store their variables in the same way, so this
 * works for any parent route (characters, items, ...) given its form id.
 */
export function submitVariable(
    formFlow: FormPopupFlow<string>,
    parentFormId: string
): FormPopupTransition {
    const parent = formFlow.getDataFromPanel(parentFormId);
    if (!parent) {
        showError('Reference object not found');
        return 'back';
    }

    const vars: VariableDeclarator[] = parent.vars ?? [];
    const data = formFlow.data;

    if (parent._varRef) {
        const index = vars.findIndex((v) => v.name === parent._varRef);
        delete parent._varRef;
        if (index >= 0) {
            vars[index] = data as VariableDeclarator;
        } else {
            showError('Variable not found');
            return 'back';
        }
    } else {
        if (vars.find((v) => v.name === data.name)) {
            showError('Variable with this name already exists');
            return 'stay';
        }
        vars.push(data as VariableDeclarator);
    }

    parent.vars = vars;
    return 'back';
}