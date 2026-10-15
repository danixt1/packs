import { expect, it } from 'vitest';
import { WorldEditor, type LabelMapper } from './worldEditor';
import type { World } from '$lib/types/data/declarative';
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