<script lang="ts">
    import { page } from '$app/state';
    import ButtonEditorCreate from '$lib/components/editor/ButtonEditorCreate.svelte';
    import EditorWrapper from '$lib/components/EditorWrapper.svelte';
    import Form from '$lib/components/Form.svelte';
    import { InputCard, InputNumber, InputSelect, InputText, InputTextArea } from '$lib/components/inputs';
    import ListConditions from '$lib/components/lists/ListConditions.svelte';
    import ObjectTable from '$lib/components/ObjectTable.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { showError, showInfo, showSucess } from '$lib/notify';
    import ContextHost from '$lib/components/ContextHost.svelte';
    import { createContextStack, type ContextFrame } from '$lib/shared/contextStack.svelte';
    import { getCurrentWorldEditor } from '$lib/shared/worldEditor';
    import type { EventConditions, TextTemplate, TextTemplateEventRoleMatch } from '$lib/types/data/declarative';

    type TemplateRole = TextTemplateEventRoleMatch & { name: string };
    type TemplateData = Partial<TextTemplate> & {
        _baseOID?: string;
        _categoriesText?: string;
        _event?: string;
        _roleName?: string;
        _roleEvent?: string;
        _roleFilters?: EventConditions[];
        _sameActorAs?: string;
        _sameTargetAs?: string;
        _sameSubjectAs?: string;
        _samePlaceAs?: string;
        _roleConditions?: any[];
        match?: TextTemplate['match'];
    };

    const editor = getCurrentWorldEditor(page.params.worldName);
    let templates = $state(editor.getTextTemplates());

    const stack = createContextStack();

    const eventConditions: { value: EventConditions; title: string }[] = [
        { value: 'FROM_THE_PLAYER', title: 'From the player' },
        { value: 'TARGETS_PLAYER', title: 'Targets the player' },
        { value: 'FROM_NON_PLAYER', title: 'From a non-player' },
        { value: 'TARGETS_NON_PLAYER', title: 'Targets a non-player' },
        { value: 'IN_PLAYER_PLACE', title: 'In the player place' }
    ];

    function emptyTemplate(): TemplateData {
        return {
            name: '',
            template: '',
            priority: 0,
            categories: [],
            _categoriesText: '',
            match: {
                primaryRole: '',
                roles: {}
            }
        };
    }

    async function startCreate() {
        const result = await stack.push<TemplateData, TextTemplate>({
            title: 'New Text Template',
            data: emptyTemplate(),
            render: renderTemplateForm,
            meta: { mode: 'create' }
        });

        if (result) {
            editor.addTextTemplate(result);
            showSucess('Template created');
            templates = editor.getTextTemplates();
        }
    }

    async function startEdit(template: Record<string, unknown>) {
        const originalOid = template.oid as string;
        const initial = $state.snapshot(template) as TemplateData;
        initial.categories ??= [];
        initial._categoriesText = initial.categories.join(', ');
        initial.match ??= { primaryRole: '', roles: {} };
        initial.match.roles ??= {};

        const result:TextTemplate | null = await stack.push<TemplateData, TextTemplate>({
            title: `Edit ${initial.name}`,
            data: initial,
            render: renderTemplateForm,
            meta: { mode: 'edit', originalOid }
        });

        if (result) {
            editor.updateObjectWithOid(originalOid, result);
            templates = editor.getTextTemplates();
            showSucess('Template updated');
        }
    }

    function handleSaveTemplate(data: TemplateData, originalOid: string | null) {
        const name = String(data.name ?? '').trim();
        const templateText = String(data.template ?? '').trim();
        const match = data.match;
        if(!name){
            showError('Template name is required!');
            return false
        }
        if(!match){
            showError("I'ts necessary to add atleast one event role!",
            "Template Text are activated by events, without role it can't by trigged to render");
            return false;
        }
        if(!match?.primaryRole){
            let rolesName = Object.keys(match?.roles ?? {});
            if(rolesName.length === 0){
                showError("I'ts necessary to add atleast one event role!",
                "Template Text are activated by events, without role it can't by trigged to render");
                return false;
            }
            if(rolesName.length > 1){
                showError("Select what role should by the main role");
            }
            if(rolesName.length === 1){
                match.primaryRole = rolesName[0];
                showInfo(`Setted ${rolesName[0]} as the primary event`);
            }
        }
        if (!name || !templateText || !match?.primaryRole || Object.keys(match.roles ?? {}).length === 0) {
            showError('Name, template text, primary role, and at least one event role are required');
            return false;
        }
        if (!match.roles[match.primaryRole]) {
            showError('The primary role must be one of the configured event roles');
            return false;
        }

        const draft = $state.snapshot(data) as TemplateData;
        draft.name = name.replaceAll(' ', '_');
        draft.template = templateText;
        draft.categories = String(draft._categoriesText ?? '')
            .split(',')
            .map((category) => category.trim())
            .filter(Boolean);
        draft.match = match;
        delete draft._baseOID;
        delete draft._categoriesText;

        const newOid = `text-template:${draft.name}`;
        if ((!originalOid || originalOid !== newOid) && editor.getObject(newOid)) {
            showError('Template name already exists');
            return false;
        }

        if (originalOid) {
            if (!editor.getObject(originalOid)) {
                showError('The template being edited no longer exists');
                templates = editor.getTextTemplates();
                return false;
            }
            return true;
        }
        return true;
    }
    function submitTemplate(frame:ContextFrame){
        let originalOid = frame.meta?.originalId || null;
        if(handleSaveTemplate(frame.draft,originalOid)){
            const name = String(frame.draft.name ?? '').trim();
            const templateText = String(frame.draft.template ?? '').trim();
            const match = frame.draft.match;
            const draft = $state.snapshot(frame.draft) as TemplateData;

            draft.name = name.replaceAll(' ', '_');
            draft.template = templateText;
            draft.categories = String(draft._categoriesText ?? '')
                .split(',')
                .map((category) => category.trim())
                .filter(Boolean);
            draft.match = match;
            delete draft._baseOID;
            delete draft._categoriesText;
            frame.resolve(draft);
        }
    }
    function deleteTemplate(template: Record<string, unknown>) {
        const oid = template.oid;
        if (typeof oid !== 'string' || !oid.startsWith('text-template:')) {
            showError('Unable to delete template: invalid template id');
            return;
        }
        editor.deleteObject(oid);
        templates = editor.getTextTemplates();
        showSucess('Template deleted');
    }
    function submitRole(frame:ContextFrame){
        let updatedRole = frame.draft;
        let roles =frame.meta!.roles;
        let originalRoleName = frame.meta!.originalId;
        const roleName = String(updatedRole._roleName ?? '').trim();
        const event = String(updatedRole._roleEvent ?? '').trim();
        if (!roleName || !event) {
            showError('Role name and event are required');
            return;
        }
        const existingRoles = roles ?? {};
        if (roleName !== originalRoleName && existingRoles[roleName]) {
            showError('Role name already exists');
            return;
        }
        const formattedRole: TemplateRole = { event,name:roleName };
        if (updatedRole._roleFilters?.length) formattedRole.filters = [...updatedRole._roleFilters];
        if (updatedRole._roleConditions?.length) formattedRole.conditions = [...updatedRole._roleConditions];
        if (updatedRole._sameActorAs) formattedRole.sameActorAs = updatedRole._sameActorAs;
        if (updatedRole._sameTargetAs) formattedRole.sameTargetAs = updatedRole._sameTargetAs;
        if (updatedRole._sameSubjectAs) formattedRole.sameSubjectAs = updatedRole._sameSubjectAs;
        if (updatedRole._samePlaceAs) formattedRole.samePlaceAs = updatedRole._samePlaceAs;
        frame.resolve(formattedRole);
    }
    async function openRole(parentFrame: any, role?: TemplateRole) {
        const roleSnapshot = role
            ? $state.snapshot({
                ...role,
                _roleName: role.name,
                _roleEvent: role.event,
                _roleFilters: [...(role.filters ?? [])],
                _sameActorAs: role.sameActorAs ?? '',
                _sameTargetAs: role.sameTargetAs ?? '',
                _sameSubjectAs: role.sameSubjectAs ?? '',
                _samePlaceAs: role.samePlaceAs ?? '',
                _roleConditions: [...(role.conditions ?? [])]
            })
            : { _roleName: '', _roleEvent: '', _roleFilters: [], _roleConditions: [], _sameActorAs: '', _sameTargetAs: '', _sameSubjectAs: '', _samePlaceAs: '' };

        const updatedRole:TemplateRole | undefined = await stack.push<any, any>({
            title: role ? `Edit Role (${role.name})` : 'Add Event Role',
            data: roleSnapshot,
            render: renderRoleForm,
            meta:{mode:role ? 'edit' : 'create',roles:parentFrame.draft.match?.roles ?? {},originalId:role?.name}
        });

        if (updatedRole) {
            const roleName = updatedRole.name;
            const existingRoles = parentFrame.draft.match?.roles ?? {};
            const currentName = role?.name;

            const rolesByName = { ...existingRoles };
            if (currentName && currentName !== roleName) delete rolesByName[currentName];
            rolesByName[roleName] = updatedRole;

            parentFrame.draft.match = {
                primaryRole: parentFrame.draft.match?.primaryRole === currentName ? roleName : (parentFrame.draft.match?.primaryRole ?? roleName),
                roles: rolesByName
            };
        }
    }

    function deleteRole(parentFrame: any, role: TemplateRole) {
        const rolesByName = { ...(parentFrame.draft.match?.roles ?? {}) };
        delete rolesByName[role.name];
        const primaryRole = parentFrame.draft.match?.primaryRole === role.name ? Object.keys(rolesByName)[0] ?? '' : parentFrame.draft.match?.primaryRole ?? '';
        parentFrame.draft.match = { primaryRole, roles: rolesByName };
    }

    function getRolesFromDraft(draft: TemplateData): TemplateRole[] {
        return Object.entries(draft.match?.roles ?? {}).map(([name, role]) => ({
            name,
            ...(role as TextTemplateEventRoleMatch)
        }));
    }
</script>

{#snippet renderTemplateForm(frame: ContextFrame)}
    {@const roles = getRolesFromDraft(frame.draft)}
    <Form onSubmit={() => submitTemplate(frame)} onCancel={() => frame.cancel()}>
        <InputText id="template-name" label="Name:" bind:value={frame.draft.name} required autocomplete="off" wrapDiv />
        <InputTextArea id="template-text" label="Template text:" bind:value={frame.draft.template} required wrapDiv />
        <InputNumber id="template-priority" label="Priority:" bind:value={frame.draft.priority} required wrapDiv />
        <InputText id="template-categories" label="Categories (comma separated):" bind:value={frame.draft._categoriesText} autocomplete="off" wrapDiv />
        <div class="form-group">
            <h3>Event match</h3>
            <InputSelect
                id="template-primary-role"
                label="Primary role:"
                bind:selected={frame.draft.match.primaryRole}
                items={[{ value: '', title: 'Select a role' }, ...roles.map((r) => ({ value: r.name, title: r.name }))]}
            />
            {#if roles.length === 0}
                <p>No event roles configured.</p>
            {:else}
                <ObjectTable
                    items={roles.map((role) => ({
                        Role: role.name,
                        Event: role.event,
                        Filters: role.filters?.join(', ') ?? '',
                        Conditions: role.conditions?.length ?? 0
                    }))}
                    headers={['Role', 'Event', 'Filters', 'Conditions']}
                    ref={roles}
                    onEdit={(role) => openRole(frame, role as unknown as TemplateRole)}
                    onDelete={(role) => deleteRole(frame, role as unknown as TemplateRole)}
                />
            {/if}
            <button type="button" class="nested-button" onclick={() => openRole(frame)}>Add event role</button>
        </div>
    </Form>
{/snippet}

{#snippet renderRoleForm(frame: any)}
    <Form onSubmit={() => submitRole(frame)} onCancel={() => frame.cancel()}>
        <InputText id="template-role-name" label="Role name:" bind:value={frame.draft._roleName} required autocomplete="off" wrapDiv />
        <InputText id="template-role-event" label="Event name:" bind:value={frame.draft._roleEvent} required autocomplete="off" wrapDiv suggestions={editor.getListEvents()} />
        <InputCard id="template-role-filters" label="Event filters:" items={eventConditions} bind:selectedItems={frame.draft._roleFilters} wrapDiv />
        <InputText id="template-role-same-actor" label="Same actor as role (optional):" bind:value={frame.draft._sameActorAs} autocomplete="off" wrapDiv />
        <InputText id="template-role-same-target" label="Same target as role (optional):" bind:value={frame.draft._sameTargetAs} autocomplete="off" wrapDiv />
        <InputText id="template-role-same-subject" label="Same subject as role (optional):" bind:value={frame.draft._sameSubjectAs} autocomplete="off" wrapDiv />
        <InputText id="template-role-same-place" label="Same place as role (optional):" bind:value={frame.draft._samePlaceAs} autocomplete="off" wrapDiv />
        <div class="form-group">
            <h3>Role conditions</h3>
            <ListConditions {stack} bind:values={frame.draft._roleConditions} />
        </div>
    </Form>
{/snippet}

<EditorWrapper>
    <div>
        <h2>Text Templates</h2>
        <p>Match runtime events with reusable text shown in the game log.</p>
    </div>
    {#if templates.length === 0}
        <p>No text templates have been added yet.</p>
    {:else}
        <ObjectTable
            items={templates.map((template) => ({
                Name: template.name,
                Event: template.match.primaryRole ? template.match.roles[template.match.primaryRole]?.event ?? '' : '',
                Roles: Object.keys(template.match.roles).length,
                Priority: template.priority ?? 0,
                Categories: template.categories?.join(', ') ?? ''
            }))}
            headers={['Name', 'Event', 'Roles', 'Priority', 'Categories']}
            ref={templates}
            onEdit={(template) => startEdit(template)}
            onDelete={(template) => deleteTemplate(template)}
        />
    {/if}
    <ButtonEditorCreate text="New Text Template" onClick={startCreate} />
</EditorWrapper>

<Popup open={stack.depth > 0} title={stack.current?.title ?? 'Text Template'} onClose={() => stack.reset()}>
    <ContextHost {stack} />
</Popup>

<style>
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .form-group h3 {
        margin: 0;
        font-size: 1rem;
    }
    .nested-button {
        width: 100%;
        padding: 0.5rem;
        color: var(--color-text);
        background: var(--bg-button);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        cursor: pointer;
    }
    .nested-button:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-accent);
    }
</style>