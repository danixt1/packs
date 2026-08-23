import { expect, it } from 'vitest';
import { WorldEditor, type LabelMapper } from './worldEditor';
import type { World } from '$lib/types/data/declarative';
function buildBlankWorld():World{
    return {
        characterActions:[],
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
it('Add action(from characters)',()=>{
    const editor = new WorldEditor(buildBlankWorld());
    editor.addActionCharacter({
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