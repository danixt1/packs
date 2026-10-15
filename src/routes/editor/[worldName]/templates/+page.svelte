<script lang="ts">
    import { page } from '$app/state';
    import ButtonEditorCreate from '$lib/components/editor/ButtonEditorCreate.svelte';
    import EditorWrapper from '$lib/components/EditorWrapper.svelte';
    import Form from '$lib/components/Form.svelte';
    import { InputCard, InputNumber, InputSelect, InputText, InputTextArea } from '$lib/components/inputs';
    import ListConditions from '$lib/components/lists/ListConditions.svelte';
    import ObjectTable from '$lib/components/ObjectTable.svelte';
    import Popup from '$lib/components/Popup.svelte';
    import { showError, showSucess } from '$lib/notify';
    import { createPageSwitch, type Switch } from '$lib/shared/pageSwitch';
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
    let openPopup = $state(false);
    let data = $state<TemplateData>({});
    let roleData = $state<TemplateData>({});
    let editing = $state<string | null>(null);
    let switcher = $state(createPageSwitch());

    const templatePage = switcher.createSwitch({ form: { onSubmit: submitTemplate, onCancel: closePopup } }, 'template');
    const rolePage = switcher.createSwitch({ form: { onSubmit: submitRole, onCancel: enableTemplatePage } }, 'role');
    const roleConditionsPage = switcher.createSwitch({ type: 'list', name: 'condition', scope: 'template-role-conditions', form: {} }, 'template-role-conditions');

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
            _sameActorAs: '',
            _sameTargetAs: '',
            _sameSubjectAs: '',
            _samePlaceAs: '',
            match: {
                primaryRole: '',
                roles: {}
            }
        };
    }

    function enableTemplatePage() {
        templatePage.enablePage();
    }

    function startCreate() {
        editing = null;
        data = emptyTemplate();
        openPopup = true;
        enableTemplatePage();
    }

    function startEdit(template: Record<string, unknown>) {
        editing = template.oid as string;
        data = $state.snapshot(template) as TemplateData;
        data.categories ??= [];
        data._categoriesText = data.categories.join(', ');
        data.match ??= { primaryRole: '', roles: {} };
        data.match.roles ??= {};
        openPopup = true;
        enableTemplatePage();
    }

    function closePopup() {
        openPopup = false;
        editing = null;
        enableTemplatePage();
    }

    function roles(): TemplateRole[] {
        return Object.entries(data.match?.roles ?? {}).map(([name, role]) => ({
            name,
            ...(role as TextTemplateEventRoleMatch)
        }));
    }

    function submitTemplate() {
        const name = String(data.name ?? '').trim();
        const templateText = String(data.template ?? '').trim();
        const match = data.match;
        if (!name || !templateText || !match?.primaryRole || Object.keys(match.roles ?? {}).length === 0) {
            showError('Name, template text, primary role, and at least one event role are required');
            return;
        }
        if (!match.roles[match.primaryRole]) {
            showError('The primary role must be one of the configured event roles');
            return;
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

        const currentOid = editing;
        const newOid = `text-template:${draft.name}`;
        if ((!currentOid || currentOid !== newOid) && editor.getObject(newOid)) {
            showError('Template name already exists');
            return;
        }

        if (currentOid) {
            if (!editor.getObject(currentOid)) {
                showError('The template being edited no longer exists');
                closePopup();
                templates = editor.getTextTemplates();
                return;
            }
            editor.updateObjectWithOid(currentOid, draft as TextTemplate);
            showSucess('Template updated');
        } else {
            editor.addTextTemplate(draft as TextTemplate);
            showSucess('Template created');
        }
        templates = editor.getTextTemplates();
        closePopup();
    }

    function deleteTemplate(template: Record<string, unknown>) {
        const oid = template.oid;
        if (typeof oid !== 'string' || !oid.startsWith('text-template:')) {
            showError('Unable to delete template: invalid template id');
            return;
        }
        editor.deleteObject(oid);
        templates = editor.getTextTemplates();
        if (editing === oid) closePopup();
        showSucess('Template deleted');
    }

    function openRole(role?: TemplateRole) {
        roleData = role
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
            : { _roleFilters: [], _roleConditions: [], _sameActorAs: '', _sameTargetAs: '', _sameSubjectAs: '', _samePlaceAs: '' };
        rolePage.enablePage();
    }

    function submitRole() {
        const roleName = String(roleData._roleName ?? '').trim();
        const event = String(roleData._roleEvent ?? '').trim();
        if (!roleName || !event) {
            showError('Role name and event are required');
            return;
        }
        const existingRoles = data.match?.roles ?? {};
        const currentName = roleData.name as string | undefined;
        if (roleName !== currentName && existingRoles[roleName]) {
            showError('Role name already exists');
            return;
        }

        const role: TextTemplateEventRoleMatch = { event };
        if (roleData._roleFilters?.length) role.filters = [...roleData._roleFilters];
        if (roleData._roleConditions?.length) role.conditions = [...roleData._roleConditions];
        if (roleData._sameActorAs) role.sameActorAs = roleData._sameActorAs;
        if (roleData._sameTargetAs) role.sameTargetAs = roleData._sameTargetAs;
        if (roleData._sameSubjectAs) role.sameSubjectAs = roleData._sameSubjectAs;
        if (roleData._samePlaceAs) role.samePlaceAs = roleData._samePlaceAs;

        const rolesByName = { ...existingRoles };
        if (currentName && currentName !== roleName) delete rolesByName[currentName];
        rolesByName[roleName] = role;
        data.match = {
            primaryRole: data.match?.primaryRole === currentName ? roleName : (data.match?.primaryRole ?? roleName),
            roles: rolesByName
        };
        enableTemplatePage();
    }

    function deleteRole(role: TemplateRole) {
        const rolesByName = { ...(data.match?.roles ?? {}) };
        delete rolesByName[role.name];
        const primaryRole = data.match?.primaryRole === role.name ? Object.keys(rolesByName)[0] ?? '' : data.match?.primaryRole ?? '';
        data.match = { primaryRole, roles: rolesByName };
    }

    function activeFormProps(): Record<string, any> {
        return switcher.getActiveSwitch()?.localData.form ?? {};
    }

    function isPageEnabled(pageToCheck: Switch) {
        return switcher.getActiveSwitch() === pageToCheck;
    }
</script>

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

<Popup open={openPopup} title="Text Template" onClose={closePopup}>
    <Form
        onSubmit={activeFormProps().onSubmit ?? submitTemplate}
        onCancel={activeFormProps().onCancel ?? closePopup}
    >
        {#if isPageEnabled(templatePage)}
            <InputText id="template-name" label="Name:" bind:value={data.name!} required autocomplete="off" wrapDiv />
            <InputTextArea id="template-text" label="Template text:" bind:value={data.template!} required wrapDiv />
            <InputNumber id="template-priority" label="Priority:" bind:value={data.priority!} required wrapDiv />
            <InputText id="template-categories" label="Categories (comma separated):" bind:value={data._categoriesText!} autocomplete="off" wrapDiv />
            <div class="form-group">
                <h3>Event match</h3>
                <InputSelect
                    id="template-primary-role"
                    label="Primary role:"
                    bind:selected={data.match!.primaryRole}
                    items={[{ value: '', title: 'Select a role' }, ...roles().map((role) => ({ value: role.name, title: role.name }))]}
                />
                {#if roles().length === 0}
                    <p>No event roles configured.</p>
                {:else}
                    <ObjectTable
                        items={roles().map((role) => ({
                            Role: role.name,
                            Event: role.event,
                            Filters: role.filters?.join(', ') ?? '',
                            Conditions: role.conditions?.length ?? 0
                        }))}
                        headers={['Role', 'Event', 'Filters', 'Conditions']}
                        ref={roles()}
                        onEdit={(role) => openRole(role as unknown as TemplateRole)}
                        onDelete={(role) => deleteRole(role as unknown as TemplateRole)}
                    />
                {/if}
                <button type="button" class="nested-button" onclick={() => openRole()}>Add event role</button>
            </div>
        {:else if isPageEnabled(rolePage)}
            <InputText id="template-role-name" label="Role name:" bind:value={roleData._roleName!} required autocomplete="off" wrapDiv />
            <InputText id="template-role-event" label="Event name:" bind:value={roleData._roleEvent!} required autocomplete="off" wrapDiv />
            <InputCard id="template-role-filters" label="Event filters:" items={eventConditions} bind:selectedItems={roleData._roleFilters!} wrapDiv />
            <InputText id="template-role-same-actor" label="Same actor as role (optional):" bind:value={roleData._sameActorAs!} autocomplete="off" wrapDiv />
            <InputText id="template-role-same-target" label="Same target as role (optional):" bind:value={roleData._sameTargetAs!} autocomplete="off" wrapDiv />
            <InputText id="template-role-same-subject" label="Same subject as role (optional):" bind:value={roleData._sameSubjectAs!} autocomplete="off" wrapDiv />
            <InputText id="template-role-same-place" label="Same place as role (optional):" bind:value={roleData._samePlaceAs!} autocomplete="off" wrapDiv />
            <div class="form-group">
                <h3>Role conditions</h3>
                <ListConditions
                    bind:values={roleData._roleConditions}
                    switcher={switcher}
                    page={roleConditionsPage}
                    onCancel={() => rolePage.enablePage()}
                    onAfterSubmit={() => rolePage.enablePage()}
                />
            </div>
        {:else if isPageEnabled(roleConditionsPage)}
            <ListConditions
                bind:values={roleData._roleConditions}
                switcher={switcher}
                page={roleConditionsPage}
                onCancel={() => rolePage.enablePage()}
                onAfterSubmit={() => rolePage.enablePage()}
            />
        {/if}
    </Form>
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