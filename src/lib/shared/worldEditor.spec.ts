import { expect, it } from 'vitest';
import { WorldEditor, type LabelMapper } from './worldEditor';
import type { ActionDeclaration, EventEffect, World } from '$lib/types/data/declarative';
import type { ContextEditing } from '$lib/types/data/editor';
function buildBlankWorld():World{
    return {
        actions:[],
        characters:[],
        description:'',
        items:[],
        name:'',
        places:[],
        textTemplates:[],
        vars:[],
        version:[1,0,0]
    }
}
it('Add A character and build the links',()=>{
    let editor = new WorldEditor(buildBlankWorld());
    editor.addCharacter({controlledByPlayer:false,id:'test',labels:['NPC'],name:'a',vars:[
        {name:'var1',type:'number',value:0}
    ]});
    let characters = (editor as any)['characters'];
    let relationVars = (editor as any)['relationVars'];
    let refs = (editor as any)['refsByOID'];
    let labelslinks = (editor as any)['labelslinks'] as Record<string,LabelMapper>;

    expect(labelslinks['NPC']).toStrictEqual<LabelMapper>({name:'NPC',usedBy:[{type:'char',oid:'char:test',usedAs:'label'}]})
    expect(characters['test']).toBeDefined();
    expect(relationVars['var1']).toBeDefined();
    expect(refs['char:test']).toStrictEqual([{is:'var',prop:'var1'},{is:'label',prop:'NPC'}]);
    
})
it('Remove character and all links',()=>{
    let world = buildBlankWorld();
    world.characters.push({id:'testid',name:'test',controlledByPlayer:false,vars:[
        {name:'var1',type:'string',value:'testValue'}
    ],
    labels:['NPC']});
    let editor = new WorldEditor(world);

    let characters = (editor as any)['characters'];
    let relationVars = (editor as any)['relationVars'];

    expect(relationVars['var1']).toBeDefined();
    
    editor.deleteObject('char:testid');

    expect(relationVars['var1']).toBeUndefined();
    expect(Object.values(characters).length == 0).toBeTruthy();

})
it('Add action',()=>{
    const editor = new WorldEditor(buildBlankWorld());
    editor.addAction({
        name:'test',
        executionTime:1,
        activationConditions:[],
        onActivate:[],
        onComplete:[],
        targets:[
            {
                target:'character',
                collectIf:[{
                    type:'condition-relational',
                    left:{type:'getter',in:'target:character-variable',variable:'ifLeft'},
                    //@ts-ignore metadata should not by processed.
                    right:{type:'getter',in:'target:character/place-metadata',variable:'NO!(right)'}
                }]
            }
        ]
    })
    let refs = (editor as any)['refsByOID'];
    expect(refs['action:test']).toStrictEqual([{is:'var',prop:'ifLeft'}]);

})

it('loads all actions from the unified world collection', () => {
    const world = buildBlankWorld();
    world.actions.push(
        {
            name:'player-action',
            executionTime:1,
            activationConditions:[],
            onActivate:[],
            onComplete:[],
            targets:[]
        },
        {
            name:'autonomous-action',
            availableTo:['autonomous'],
            executionTime:1,
            activationConditions:[],
            onActivate:[],
            onComplete:[],
            targets:[]
        }
    );

    const editor = new WorldEditor(world);

    expect(editor.getActions().map((action) => action.name)).toEqual(['player-action', 'autonomous-action']);
    expect(editor.getActions().every((action) => action.oid.startsWith('action:'))).toBe(true);
});

it('loads, updates, deletes, and serializes text templates', () => {
    const world = buildBlankWorld();
    world.textTemplates.push({
        type: 'text-template',
        name: 'welcome',
        template: 'Welcome!',
        match: {
            primaryRole: 'start',
            roles: { start: { event: 'GAME_START' } }
        }
    });
    const editor = new WorldEditor(world);

    expect(editor.getTextTemplates()).toHaveLength(1);
    expect(editor.getTextTemplates()[0].oid).toBe('text-template:welcome');

    editor.updateObjectWithOid('text-template:welcome', {
        type: 'text-template',
        name: 'updated',
        template: 'Updated!',
        match: {
            primaryRole: 'start',
            roles: { start: { event: 'GAME_START' } }
        }
    });
    expect(editor.getTextTemplates().map((template) => template.name)).toEqual(['updated']);

    editor.deleteObject('text-template:updated');
    expect(editor.getTextTemplates()).toHaveLength(0);
    expect(editor.toWorld().textTemplates).toEqual([]);
});

it('correct update action with temp vars',()=>{
    const world = buildBlankWorld();
    let changeEvent:EventEffect = {
                type:'event',
                event:'TEST_EVENT',
                data:{}
            }
    let action:ActionDeclaration = {
        name:'test-action',
        targets:[{
            collectIf:[],
            target:'character',
            type:'collector'
        }],
        activationConditions:[],
        executionTime:5,
        onActivate:[
            {
                type:'setter',
                mode:'set',
                value:{type:'getter',in:'self-variable',variable:'currentTime'},
                var:{type:'getter',in:'temp-variable',variable:'test-var'}
            },
            {
                type:'setter',
                mode:'decrement',
                value:{type:'getter',in:'self-variable',variable:'startedAt'},
                var:{type:'getter',in:'temp-variable',variable:'test-var'}
            },
            changeEvent
        ],
        onComplete:[],
    }
    world.characters.push({
        id:'test-char',
        name:'test',
        controlledByPlayer:true,
        vars:[
            {name:'char-var1',type:'number',value:24}
        ]
    })
    const editor = new WorldEditor(world);
    editor.addAction(action);
    let updated = editor.getActions()[0];
    changeEvent.data = {
        ctx:{type:'getter',in:'temp-variable',variable:'test-var'}
    }
    updated.onActivate[1] = changeEvent;
    editor.updateObject(updated);
    expect(editor.getListEvents()).toStrictEqual(['TEST_EVENT'])
})

it('leaves objects and variables unchanged when no contexts are selected', () => {
    const world = buildBlankWorld();
    world.characters.push(
        { id: 'alice', name: 'Alice', controlledByPlayer: false, vars: [
            { name: 'health', type: 'number', value: 10 },
            { name: 'secret', type: 'string', value: 'hidden' }
        ] },
        { id: 'bob', name: 'Bob', controlledByPlayer: false, vars: [] }
    );

    const editor = new WorldEditor(world);

    expect(editor.getCharacters().map(({ name, vars }) => ({ name, vars: vars.map(({ name }) => name) }))).toEqual([
        { name: 'Alice', vars: ['health', 'secret'] },
        { name: 'Bob', vars: [] }
    ]);
});

it('filters objects and variables by selected contexts and their descendants', () => {
    const world = buildBlankWorld();
    world.characters.push(
        { id: 'alice', name: 'Alice', controlledByPlayer: false, vars: [
            { name: 'health', type: 'number', value: 10 },
            { name: 'secret', type: 'string', value: 'hidden' }
        ] },
        { id: 'bob', name: 'Bob', controlledByPlayer: false, vars: [
            { name: 'mood', type: 'string', value: 'calm' },
            { name: 'secret', type: 'string', value: 'hidden' }
        ] },
        { id: 'carol', name: 'Carol', controlledByPlayer: false, vars: [] }
    );
    const rootContext: ContextEditing = {
        name: 'world',
        description: '',
        parent: null,
        varsAllowed: ['health'],
        objectsInCtx: { character: ['Alice'] }
    };
    const childContext: ContextEditing = {
        name: 'battle',
        description: '',
        parent: 'world',
        varsAllowed: ['mood'],
        objectsInCtx: { character: ['Bob'] }
    };
    world.editor = { ctxs: [rootContext, childContext] };

    const editor = new WorldEditor(world);
    editor.setCurrentContexts([editor.getContexts()[0]]);

    expect(editor.getCharacters().map(({ name, vars }) => ({ name, vars: vars.map(({ name }) => name) }))).toEqual([
        { name: 'Alice', vars: ['health'] },
        { name: 'Bob', vars: ['mood'] }
    ]);
});

it('hides object types that are not included in a selected context', () => {
    const world = buildBlankWorld();
    world.characters.push({
        id: 'alice',
        name: 'Alice',
        controlledByPlayer: false,
        vars: [{ name: 'secret', type: 'string', value: 'hidden' }]
    });
    world.actions.push({
        name: 'attack',
        executionTime: 1,
        activationConditions: [],
        onActivate: [],
        onComplete: [],
        targets: []
    });
    world.editor = {
        ctxs: [{
            name: 'characters-only',
            description: '',
            parent: null,
            varsAllowed: [],
            objectsInCtx: { character: ['Alice'] }
        }]
    };

    const editor = new WorldEditor(world);
    editor.setCurrentContexts(editor.getContexts());

    expect(editor.getCharacters().map(({ name, vars }) => ({ name, vars: vars.map(({ name }) => name) }))).toEqual([
        { name: 'Alice', vars: [] }
    ]);
    expect(editor.getActions()).toEqual([]);
    expect(editor.getCharacters(true).map(({ name }) => name)).toEqual(['Alice']);
});

it('reads and updates object contexts without adding membership data to the object', () => {
    const world = buildBlankWorld();
    world.characters.push({ id: 'alice', name: 'Alice', controlledByPlayer: false, vars: [] });
    world.editor = {
        ctxs: [
            { name: 'world', description: '', parent: null, varsAllowed: [], objectsInCtx: {} },
            { name: 'battle', description: '', parent: 'world', varsAllowed: [], objectsInCtx: {} }
        ]
    };

    const editor = new WorldEditor(world);
    editor.setObjectContexts('character', 'Alice', ['world.battle']);

    expect(editor.getObjectContexts('character', 'Alice')).toEqual(['world.battle']);
    expect((editor.toWorld().characters[0] as any)._contextPaths).toBeUndefined();
    expect(editor.toWorld().editor?.ctxs?.[1].objectsInCtx.character).toEqual(['Alice']);
});

it('moves object context membership when its name changes', () => {
    const world = buildBlankWorld();
    world.characters.push({ id: 'alice', name: 'Alice', controlledByPlayer: false, vars: [] });
    world.editor = {
        ctxs: [{
            name: 'town',
            description: '',
            parent: null,
            varsAllowed: [],
            objectsInCtx: { character: ['Alice'] }
        }]
    };

    const editor = new WorldEditor(world);
    editor.updateObjectWithOid('char:alice', { id: 'alice', name: 'Alicia', controlledByPlayer: false, vars: [] });

    expect(editor.getObjectContexts('character', 'Alice')).toEqual([]);
    expect(editor.getObjectContexts('character', 'Alicia')).toEqual(['town']);
});

it('removes object memberships when the last object with that name is deleted', () => {
    const world = buildBlankWorld();
    world.items.push({ id: 'potion', name: 'Potion', description: '', vars: [] });
    world.editor = {
        ctxs: [{
            name: 'inventory',
            description: '',
            parent: null,
            varsAllowed: [],
            objectsInCtx: { item: ['Potion'] }
        }]
    };

    const editor = new WorldEditor(world);
    editor.deleteObject('item:potion');

    expect(editor.getObjectContexts('item', 'Potion')).toEqual([]);
    expect(editor.getContexts()[0].objectsInCtx.item).toBeUndefined();
});

it('keeps variable context membership global for same-named variables', () => {
    const world = buildBlankWorld();
    world.characters.push({
        id: 'alice', name: 'Alice', controlledByPlayer: false,
        vars: [{ name: 'health', type: 'number', value: 10 }]
    });
    world.items.push({
        id: 'potion', name: 'Potion', description: '',
        vars: [{ name: 'health', type: 'number', value: 1 }]
    });
    world.editor = {
        ctxs: [{
            name: 'combat', description: '', parent: null, varsAllowed: [],
            objectsInCtx: { character: ['Alice'], item: ['Potion'] }
        }]
    };

    const editor = new WorldEditor(world);
    editor.setVariableContexts('health', ['combat']);
    editor.setCurrentContexts(editor.getContexts());

    expect(editor.getVariableContexts('health')).toEqual(['combat']);
    expect(editor.getCharacters()[0].vars.map(({ name }) => name)).toEqual(['health']);
    expect(editor.getItems()[0].vars.map(({ name }) => name)).toEqual(['health']);
});

it('renames variable memberships and removes them after the last declaration is deleted', () => {
    const world = buildBlankWorld();
    world.characters.push({
        id: 'alice', name: 'Alice', controlledByPlayer: false,
        vars: [{ name: 'health', type: 'number', value: 10 }]
    });
    world.items.push({
        id: 'potion', name: 'Potion', description: '',
        vars: [{ name: 'health', type: 'number', value: 1 }]
    });
    world.editor = {
        ctxs: [
            { name: 'combat', description: '', parent: null, varsAllowed: ['health'], objectsInCtx: {} },
            { name: 'magic', description: '', parent: null, varsAllowed: [], objectsInCtx: {} }
        ]
    };

    const editor = new WorldEditor(world);
    editor.updateObjectWithOid('char:alice', {
        id: 'alice', name: 'Alice', controlledByPlayer: false,
        vars: [{ name: 'mana', type: 'number', value: 5 }]
    });
    editor.syncVariableContexts(['mana'], { mana: ['magic'] }, ['health']);

    expect(editor.getVariableContexts('health')).toEqual(['combat']);
    expect(editor.getVariableContexts('mana')).toEqual(['magic']);

    editor.deleteObject('item:potion');
    expect(editor.getVariableContexts('health')).toEqual([]);
});

it('prunes stale object and variable memberships when loading a world', () => {
    const world = buildBlankWorld();
    world.characters.push({
        id: 'alice', name: 'Alice', controlledByPlayer: false,
        vars: [{ name: 'health', type: 'number', value: 10 }]
    });
    world.editor = {
        ctxs: [{
            name: 'world',
            description: '',
            parent: null,
            varsAllowed: ['health', 'deleted-variable'],
            objectsInCtx: { character: ['Alice', 'Deleted Character'], item: ['Deleted Item'] }
        }]
    };

    const editor = new WorldEditor(world);

    expect(editor.getContexts()[0].varsAllowed).toEqual(['health']);
    expect(editor.getContexts()[0].objectsInCtx).toEqual({ character: ['Alice'] });
    expect(editor.getContexts()).toHaveLength(1);
});

it('applies object-only and variable-only contexts independently', () => {
    const world = buildBlankWorld();
    world.characters.push(
        { id: 'alice', name: 'Alice', controlledByPlayer: false, vars: [
            { name: 'health', type: 'number', value: 10 },
            { name: 'social', type: 'number', value: 4 }
        ] },
        { id: 'bob', name: 'Bob', controlledByPlayer: false, vars: [
            { name: 'health', type: 'number', value: 8 }
        ] }
    );
    world.editor = {
        ctxs: [
            {
                name: 'battle', description: '', parent: null, appliesTo: 'objects',
                varsAllowed: ['health'], objectsInCtx: { character: ['Alice'] }
            },
            {
                name: 'social', description: '', parent: null, appliesTo: 'variables',
                varsAllowed: ['social'], objectsInCtx: { character: ['Bob'] }
            }
        ]
    };

    const editor = new WorldEditor(world);
    editor.setCurrentContexts([editor.getContexts()[0]]);
    expect(editor.getCharacters().map(({ name, vars }) => ({ name, vars: vars.map(({ name }) => name) }))).toEqual([
        { name: 'Alice', vars: ['health', 'social'] }
    ]);
    expect(editor.filterVariablesByCurrentContexts(world.characters[0].vars).map(({ name }) => name)).toEqual(['health', 'social']);

    editor.setCurrentContexts([editor.getContexts()[1]]);
    expect(editor.getCharacters().map(({ name, vars }) => ({ name, vars: vars.map(({ name }) => name) }))).toEqual([
        { name: 'Alice', vars: ['social'] },
        { name: 'Bob', vars: [] }
    ]);
    expect(editor.filterVariablesByCurrentContexts(world.characters[0].vars).map(({ name }) => name)).toEqual(['social']);
});
