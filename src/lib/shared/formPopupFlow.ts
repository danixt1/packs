export type FormPopupTransition = 'stay' | 'back' | 'close';

export interface FormPopupFormDefinition<FormId extends string> {
    title: string | (() => string);
    parent?: FormId;
    onSubmit?: () => FormPopupTransition | void;
}

export interface FormPopupFlow<FormId extends string> {
    isOpen: boolean;
    activeForm: FormId;
    readonly title: string;
    history: FormId[];
    dataPanels:Record<string,any>[]
    open(form?: FormId,data?:Record<string,any>): void;
    enter(form: FormId): void;
    submit(): void;
    cancel(): void;
    dismiss(): void;
    close(): void;
    data:Record<string,any>;
}

interface InternalFormPopupFlow<FormId extends string> extends FormPopupFlow<FormId> {
    applyTransition(transition: FormPopupTransition): void;
}

/**
 * Controls a popup containing a root form and any number of nested forms.
 * Wrap the returned value in Svelte's `$state` when it is used by a component.
 */
export function createFormPopupFlow<FormId extends string>(
    initialForm: FormId,
    forms: Record<FormId, FormPopupFormDefinition<FormId>>
): FormPopupFlow<FormId> {
    function formTitle(form: FormId) {
        const title = forms[form].title;
        return typeof title === 'function' ? title() : title;
    }

    const flow: InternalFormPopupFlow<FormId> = {
        dataPanels:[],
        data:{},
        isOpen: false,
        activeForm: initialForm,
        get title() {
            return formTitle(this.activeForm);
        },
        history: [],
        open(form = initialForm,data) {
            this.data = {}
            if(data){
                this.data = data;
            }
            this.isOpen = true;
            this.activeForm = form;
            this.history = [];
        },
        enter(form) {
            if (!this.isOpen) {
                this.open(form);
                return;
            }
            this.dataPanels.push(this.data);
            this.data = {};
            this.history = [...this.history, this.activeForm];
            this.activeForm = form;
        },
        submit() {
            const definition = forms[this.activeForm];
            const transition = definition.onSubmit?.() ?? (definition.parent ? 'back' : 'close');
            this.applyTransition(transition);
        },
        cancel() {
            this.applyTransition('back');
        },
        dismiss() {
            this.applyTransition('back');
        },
        close() {
            this.isOpen = false;
            this.activeForm = initialForm;
            this.history = [];
        },
        applyTransition(transition: FormPopupTransition) {
            if (transition === 'stay') return;
            if (transition === 'close') {
                this.close();
                return;
            }

            const previousForm = this.history.at(-1) ?? forms[this.activeForm].parent;
            const lastForm = this.dataPanels.pop();
            if(lastForm){
                this.data = lastForm;
            }
            if (!previousForm) {
                this.close();
                return;
            }

            this.activeForm = previousForm;
            this.history = this.history.slice(0, -1);
        }
    };

    return flow;
}
