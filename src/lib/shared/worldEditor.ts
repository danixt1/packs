import type { ActionDeclaration, Character, Collector, ConditionalList, ConditionExists, ConditionIsValid, ConditionRelational, DialogueTree, Display, EffectFomAction, EffectInterrupt, Item, Place, TextTemplate, VariableDeclarator, VariableModify, VariableToGet, World } from "$lib/types/data/declarative";
import { world as mainWorld } from '$lib/data/world';
let currentEditor:null|WorldEditor = null;

type Relation = ({
    relation:'use'
    relationWith:'text-template'|'display'|'action'|'dialogue',
    subLocation:string
} | {relation:'declare', relationWith:'item'|'char'|'place'|'world', data:VariableDeclarator } 
| {relation:'modify',relationWith:'action',subLocation:string}) & {oid:string};

export class WorldEditor {
    private relationVars:Record<string,Relation[]> = {};
    private labelslinks:Record<string,string[]> = {};
    private objectsByOid:Record<string,any> = {};
    public worldName:string;

    private characters:Record<string,Character> = {};
    private places:Record<string,Place> = {};
    private actionChar:Record<string,ActionDeclaration> = {};
    private dialogues:Record<string,DialogueTree> = {};
    private textTemplates:Record<string,TextTemplate> = {};
    private items:Record<string,Item> = {};
    private displays:Record<string,Display> = {};

    //TODO autonomous actions
    constructor(world:World){
        this.worldName = world.name;
        world.vars              .forEach( e => this.linkVariableDeclarator(e,'world'));
        world.characters        .forEach( e => this.addCharacter(e));
        world.places            .forEach( e => this.addPlace(e));
        world.characterActions  .forEach( e => this.addActionCharacter(e));
        world.textTemplates     .forEach( e => this.addTextTemplate(e));
        world.items             .forEach( e => this.addItem(e));
        world.dialogues         ?.forEach(e => this.addDialogue(e));
        world.displays          ?.forEach(e => this.addDisplay(e));
    }
    public addActionCharacter(action:ActionDeclaration){
        const oid = 'action:'+action.name;
        this.actionChar[action.name] = action;
        this.objectsByOid[oid] = action;
        action.onActivate.forEach(e =>this.analyzeEffect(e,oid,'onActivate'));
        action.onComplete.forEach(e => this.analyzeEffect(e,oid,'onComplete'));
        action.onInterrupt?.forEach(e => this.analyzeEffect(e,oid,'onInterrupt'));
        if(action.display){
            this.extractVariablesRefInText(action.display.name).forEach((e)=>this.analyzeGetter(e,oid,'display-name'))
            this.extractVariablesRefInText(action.display.description).forEach((e)=>this.analyzeGetter(e,oid,'display-description'))
        }
        if(action.interruption){
            if(action.interruption.interruptSelfConditions){
                this.analyzeConditionalLists(action.interruption.interruptSelfConditions,oid,'interrupt(self)');
            }
            if(action.interruption.interruptTargetConditions){
                this.analyzeConditionalLists(action.interruption.interruptTargetConditions,oid,'interruput(target)');
            }
        }
        for(const target of action.targets){
            if(['character','place','item'].includes(target.target)){
                this.analyzeConditionalLists((target as Collector).collectIf,oid,'target');
            }
        }
        this.analyzeConditionalLists(action.activationConditions,oid,'activate');
    }
    public addCharacter(char:Character){
        const oid = 'char:'+char.id;
        this.objectsByOid[oid] = char;
        this.characters[char.id] = char;
        char.vars.forEach(e =>this.linkVariableDeclarator(e,oid));
        char.labels?.forEach(e =>this.linkLabel(e,oid));
    }
    public addPlace(place:Place){
        const oid = 'place:' + place.id;
        this.objectsByOid[oid] = place;
        this.places[place.id] = place;
        place.vars.forEach(e =>this.linkVariableDeclarator(e,oid));
    }
    public addDialogue(dialogue:DialogueTree){
        const oid = 'dialogue:'+dialogue.id;
        this.objectsByOid[oid] = dialogue;
        this.dialogues[dialogue.id] = dialogue;

        if(dialogue.match){
            const match = dialogue.match;
            //TODO think in a way to build links as usage of the labels.
            if(match.conditions){
                this.analyzeConditionalLists(match.conditions,oid,'conditions(dialogue)');
            }
        }
        for(const node of dialogue.nodes){
            if(typeof node.speaker === 'object' && typeof node.speaker.id === 'object'){
                this.analyzeGetter(node.speaker.id,oid,'speaker-select');
            }
            node.onEnter?.forEach((e)=>this.analyzeEffect(e,oid,'onEnter'));
            for(const choice of node.choices){
                if(choice.conditions){
                    this.analyzeConditionalLists(choice.conditions,oid,'conditions(choice)');
                }
                choice.effects?.forEach(e => this.analyzeEffect(e,oid,'effects'));
            }
        }
    }
    public addTextTemplate(textTemplate:TextTemplate){
        textTemplate.name = textTemplate.name.replaceAll(' ','_');
        const oid = 'text-template:'+textTemplate.name;
        this.objectsByOid[oid] = textTemplate;
        this.textTemplates[textTemplate.name] = textTemplate;
    }
    public addItem(item:Item){
        const oid = 'item:'+item.id;
        this.objectsByOid[oid] = item;
        this.items[item.id] = item;
        item.vars.forEach(e => this.linkVariableDeclarator(e,oid));
    }
    public addDisplay(display:Display){
        const oid = 'display:'+display.varName;
        this.objectsByOid[oid] = display;
        this.displays[display.varName] = display;
        this.linkVariableUsage(display.varName,oid,'display');
    }
    public getObject(oid:string){
        return this.objectsByOid[oid];
    }
    public updateObject(oid:string,obj:any){
        const objName = oid.substring(0,oid.indexOf(':'));
        const options:Record<string,(data:any)=>void> = {
            'action':this.addActionCharacter,
            'char':this.addCharacter,
            'place':this.addPlace,
            'dialogue':this.addDialogue,
            'text-template':this.addTextTemplate,
            'item':this.addItem,
            'display':this.addDisplay
        }
        const selected = options[objName];
        if(!selected){
            throw new Error('Invalid oid, type "'+objName + '" not found');
        }
        selected.call(this,obj);
    }
    private extractVariablesRefInText(text:string){
        let matchs =text.match(/([^\\]|^)(\$([^$]+)[^\\]\$)/g);
        if(!matchs){
            return [];
        }
        return matchs.map(extract);
        function extract(matchedText:string){
            matchedText = matchedText.substring(matchedText.indexOf('$') + 1,matchedText.length - 1);
            let [_,fullLoc,varName] = matchedText.match(/(\w+:[\w/]+-\w+):([\w_]+)/)!;
            return {
                in:fullLoc,
                variable:varName
            } as VariableToGet
        }
    }
    private analyzeConditionalLists(list:ConditionalList<any>[],originOid:string,sublocation:string){
        for(const value of Object.values(list)){
            if(typeof value === 'object'){
                this.analyzeCondition(value,originOid,sublocation+'-conditionalList');
            }
        }
    }
    private analyzeEffect(effect:EffectFomAction|EffectInterrupt,originOid:string,sublocation:string){
        switch(effect.type){
            case 'move':
                this.analyzeGetter(effect.moveId,originOid,sublocation+'-action(move)');
                this.analyzeGetter(effect.toId,originOid,sublocation+'-action(move)');
                break;
            case 'conditional':
                effect.conditions.forEach(e =>typeof e === 'object' ? this.analyzeCondition(e,originOid,sublocation+'-action:condition') : undefined )
                effect.onFalse?.forEach(e => this.analyzeEffect(e,originOid,sublocation + '-action:effect(onFalse)'));
                effect.onTrue.forEach(e => this.analyzeEffect(e,originOid,sublocation + '-action:effect(onTrue)'));
                break;
            case 'event':
                if(effect.data){
                    for(const value of Object.values(effect.data)){
                        if(typeof value === 'object'){
                            this.analyzeGetter(value,originOid,sublocation + '-action:event(data)');
                        }
                    }
                }
                if(effect.context){
                    for(const value of Object.values(effect.context)){
                        if(typeof value === 'object' && value.type == 'getter'){
                            this.analyzeGetter(value,originOid,sublocation + '-action:event(context)');
                        }
                    }
                }
                break;
            case 'setter':
                this.analyzeSetter(effect,originOid,sublocation+'-action:setter');
                break;
        }
    }
    private analyzeSetter(setter:VariableModify,originOid:string,subLocation:string){
        this.linkVariableSetter(setter.var.variable,originOid,subLocation);
    }
    private analyzeGetter(getter:VariableToGet,originOid:string,subLocation:string){
        if(!getter.in.endsWith('variable')){
            return;
        }
        this.linkVariableUsage(getter.variable,originOid,subLocation);
    }
    private analyzeCondition(cond:ConditionRelational<any,any>|ConditionExists<any>|ConditionIsValid<any>,originOid:string,subLocation:string){
        switch(cond.type){
            case 'condition-exists':
                this.analyzeGetter(cond.variableToCheck,originOid,subLocation + '-exists');
                break;
            case 'condition-is-valid':
                this.analyzeGetter(cond.variableToCheck,originOid,subLocation + '-isValid');
                break;
            case 'condition-relational':
                if(typeof cond.left === 'object'){
                    this.analyzeGetter(cond.left,originOid,subLocation + '-left');
                }
                if(typeof cond.right === 'object'){
                    this.analyzeGetter(cond.right,originOid,subLocation + '-right');
                }
            break;
        }
    }
    private linkLabel(label:string,oidLinkedObj:string){
        if(!this.labelslinks[label]){
            this.labelslinks[label] = [];
        }
        this.labelslinks[label].push(oidLinkedObj);
    }
    private linkVariableSetter(varName:string,originOid:string,subLocation:string){
        if(!['action','dialogue'].includes(getObjName(originOid))){
            throw new Error('Invalid object type');
        }
        this.relationVars[varName].push({
            relation:'modify',
            relationWith:'action',
            oid:originOid,
            subLocation
        })
    }
    private linkVariableUsage(varName:string,oid:string,subLocation:string){
        if(!this.relationVars[varName]){
            this.relationVars[varName] = [];
        };
        let referedType = getObjName(oid) as 'text-template'|'display'|'action'|'dialogue';
        if(!['text-template','display','action','dialogue'].includes(referedType)){
            throw new Error('Invalid object type');
        }
        this.relationVars[varName].push({
            relation:'use',
            relationWith:referedType,
            oid,
            subLocation
        })
    }
    private linkVariableDeclarator(varData:VariableDeclarator,oid:string){
        if(!this.relationVars[varData.name]){
            this.relationVars[varData.name] = [];
        };
        let referedType = getObjName(oid) as 'char'|'item'|'place';
        if(!['char','item','place'].includes(referedType)){
            throw new Error('Invalid object type');
        }
        this.relationVars[varData.name].push({
            relation:'declare',
            relationWith:referedType,
            data:varData,
            oid
        })
    }
}
function getObjName(oid:string){
    return oid.slice(0,oid.indexOf(':'));
}
export function getCurrentWorldEditor(worldName?:string){
    if(!currentEditor){
        if(!worldName){
            throw new Error('No World loaded, and no world passed to load');
        }
        currentEditor = new WorldEditor(loadWorld(worldName));
        return currentEditor;
    }
    if(!worldName){
        return currentEditor;
    }
    if(worldName != currentEditor.worldName){
        currentEditor = new WorldEditor(loadWorld(worldName));
        return currentEditor;
    }
    return currentEditor;
}

function loadWorld(worldName:string){
    let worldToLoad = localStorage.getItem('world-'+worldName);
    if(!worldToLoad){
        if(worldName == 'main'){
            return mainWorld;
        }
        throw new Error('Failed loading world');
    }
    return JSON.parse(worldToLoad) as World;
}