import type { ActionDeclaration, Character, Collector, ConditionalList, ConditionExists, ConditionIsValid, ConditionRelational, DialogueTree, Display, EffectFomAction, EffectInterrupt, Item, Place, TextTemplate, VariableDeclarator, VariableModify, VariableToGet, World } from "$lib/types/data/declarative";
import { world as mainWorld } from '$lib/data/world';
import type { LabelInfo } from "$lib/types/data/editor";
let currentEditor:null|WorldEditor = null;

type VarRelation = ({
    relation:'use'
    relationWith:'text-template'|'display'|'action'|'dialogue',
    subLocation:string
} | {relation:'declare', relationWith:'item'|'char'|'place'|'world', data:VariableDeclarator } 
| {relation:'modify',relationWith:'action',subLocation:string}) & {oid:string};

export interface LabelMapper{
    name:string
    title?:string
    description?:string
    usedBy:{type:'char'|'item'|'dialogue',oid:string,usedAs:string}[]
}
interface itemWithOid{
    /** Object identificator */
    oid:string;
}
export interface CharacterEditor extends Character, itemWithOid{}
export interface PlaceEditor extends Place, itemWithOid{}
export interface DialogueEditor extends DialogueTree, itemWithOid{}
export interface TextTemplateEditor extends TextTemplate, itemWithOid{}
export interface ItemEditor extends Item, itemWithOid{}
export interface DisplayEditor extends Display, itemWithOid{}

export class WorldEditor {
    private relationVars:Record<string,VarRelation[]> = {};
    private labelslinks:Record<string,LabelMapper> = {};
    private refsByOID:Record<string,{is:'label'|'var',prop:string}[]> = {};
    private objectsByOid:Record<string,any> = {};
    public worldName:string;

    private characters:Record<string,CharacterEditor> = {};
    private places:Record<string,PlaceEditor> = {};
    private actionChar:Record<string,ActionDeclaration> = {};
    private dialogues:Record<string,DialogueEditor> = {};
    private textTemplates:Record<string,TextTemplateEditor> = {};
    private items:Record<string,ItemEditor> = {};
    private displays:Record<string,DisplayEditor> = {};

    //TODO autonomous actions
    constructor(world:World){
        this.worldName = world.name;
        const editorInfo = world.editor;
        if(editorInfo){
            Object.entries(editorInfo.labelsDescription ?? []).forEach(([k,v])=>this.addLabel(k,v));
        }
        world.vars              .forEach( e => this.linkVariableDeclarator(e,'world'));
        world.characters        .forEach( e => this.addCharacter(e));
        world.places            .forEach( e => this.addPlace(e));
        world.characterActions  .forEach( e => this.addActionCharacter(e));
        world.textTemplates     .forEach( e => this.addTextTemplate(e));
        world.items             .forEach( e => this.addItem(e));
        world.dialogues         ?.forEach(e => this.addDialogue(e));
        world.displays          ?.forEach(e => this.addDisplay(e));
    }
    public addLabel(name:string,info:LabelInfo){
        if(!this.labelslinks[name]){
            this.labelslinks[name] = {
                name,
                usedBy:[]
            }
        }
        this.labelslinks[name].description = info.description;
        this.labelslinks[name].title = info.title;
        this.objectsByOid['label:'+name] = info;
    }
    public addActionCharacter(action:ActionDeclaration){
        const oid = 'action:'+action.name;
        this.actionChar[action.name] = action;
        this.objectsByOid[oid] = action;

        action.onActivate   .forEach(e => this.analyzeEffect(e,oid,'onActivate'));
        action.onComplete   .forEach(e => this.analyzeEffect(e,oid,'onComplete'));
        action.onInterrupt ?.forEach(e => this.analyzeEffect(e,oid,'onInterrupt'));
        if(action.display){
            this.extractVariablesRefInText(action.display.name)       .forEach((e)=>this.analyzeGetter(e,oid,'display-name'))
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
        this.characters[char.id] = {...char, oid};
        char.vars.forEach(e =>this.linkVariableDeclarator(e,oid));
        char.labels?.forEach(e =>this.linkLabel(e,oid,'label'));
    }
    public addPlace(place:Place){
        const oid = 'place:' + place.id;
        this.objectsByOid[oid] = place;
        this.places[place.id] = {...place, oid};
        place.vars.forEach(e =>this.linkVariableDeclarator(e,oid));
    }
    public addDialogue(dialogue:DialogueTree){
        const oid = 'dialogue:'+dialogue.id;
        this.objectsByOid[oid] = dialogue;
        this.dialogues[dialogue.id] = {...dialogue, oid};

        if(dialogue.match){
            const match = dialogue.match;
            //TODO think in a way to build links as usage of the labels.
            if(match.conditions){
                this.analyzeConditionalLists(match.conditions,oid,'conditions(dialogue)');
            }
            const opts = {
                targetLabelsAny: 'Target has any of the labels',
                targetLabelsAll: 'Target has all of the labels',
                targetLabelsNone: 'Target has none of the labels',
                selfLabelsAny: 'Self has any of the labels',
                selfLabelsAll: 'Self has all of the labels',
                selfLabelsNone: 'Self has none of the labels'
            }
            for(const [index,value] of Object.entries(opts) as [keyof typeof opts,string][]){
                if(!match[index]){
                    continue
                }
                for(const labelName of match[index]){
                    this.linkLabel(labelName,oid,value);
                }
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
        this.textTemplates[textTemplate.name] = {...textTemplate, oid};
    }
    public addItem(item:Item){
        const oid = 'item:'+item.id;
        this.objectsByOid[oid] = item;
        this.items[item.id] = {...item, oid};
        item.vars.forEach(e => this.linkVariableDeclarator(e,oid));
    }
    public addDisplay(display:Display){
        const oid = 'display:'+display.varName;
        this.objectsByOid[oid] = display;
        this.displays[display.varName] = {...display, oid};
        this.linkVariableUsage(display.varName,oid,'display');
    }
    public deleteObject(oid:string){
        if(!this.objectsByOid[oid]){
            return;
        }
        const objName = getObjName(oid);
        const opts:Record<string,any> = {
            'char':this.characters,
            'item':this.items,
            'place':this.places,
            'action':this.actionChar,
            'dialogue':this.dialogues,
            'display':this.displays
        }
        let selected = opts[objName];
        if(!selected){
            throw new Error('Invalid data OID:"'+objName + '" not found');
        }
        delete selected[oid.slice(oid.indexOf(':') + 1)];
        delete this.objectsByOid[oid];
        this.delAllRefs(oid);
    }
    public getCharacters():CharacterEditor[]{
        return Object.values(this.characters);
    }
    public getLabels(){
        return Object.values(this.labelslinks)
    }
    public getObject(oid:string){
        return this.objectsByOid[oid];
    }

    public updateObject(obj:itemWithOid){
        this.updateObjectWithOid(obj.oid,obj);
    }
    public updateObjectWithOid(oid:string,obj:any){
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
        // Expensive, but if the OID of the character was updated it gonna generate duplication.
        this.deleteObject(oid);
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
            default:
                console.error('Invalid condition, type is not defined');
                break;
        }
    }
    private delAllRefs(oid:string){
        let refs = this.refsByOID[oid];
        if(!refs){
            return
        }
        for(const ref of refs){
            if(ref.is == 'var'){
                this.relationVars[ref.prop] = this.relationVars[ref.prop].filter((e)=>e.oid != oid);
                if(this.relationVars[ref.prop].length === 0){
                    delete this.relationVars[ref.prop]
                }
                continue;
            }
            if(ref.is == 'label'){
                this.labelslinks[ref.prop].usedBy = this.labelslinks[ref.prop].usedBy.filter((e)=>e.oid != oid);
            }
        }
        delete this.refsByOID[oid];
    }
    private linkLabel(label:string,oidLinkedObj:string,usedAs:string){
        if(!this.labelslinks[label]){
            this.labelslinks[label] = {
                name:label,
                usedBy:[]
            };
        }
        if(!this.refsByOID[oidLinkedObj]){
            this.refsByOID[oidLinkedObj] = [];
        }
        const referedType = getObjName(oidLinkedObj) as 'char'|'item'|'dialogue'
        if(!['char','item','dialogue'].includes(referedType)){
            throw new Error('Invalid object type');
        }
        this.refsByOID[oidLinkedObj].push({is:'label',prop:label});
        this.labelslinks[label].usedBy.push({
            oid:oidLinkedObj,
            type:referedType,
            usedAs
        })
    }
    private linkVariableSetter(varName:string,originOid:string,subLocation:string){
        if(!['action','dialogue'].includes(getObjName(originOid))){
            throw new Error('Invalid object type');
        }
        if(!this.relationVars[varName]){
            this.relationVars[varName] = [];
        }
        if(!this.refsByOID[originOid]){
            this.refsByOID[originOid] = [];
        }
        this.refsByOID[originOid].push({is:'var',prop:varName});
        this.relationVars[varName].push({
            relation:'modify',
            relationWith:'action',
            oid:originOid,
            subLocation
        })
    }
    private linkVariableUsage(varName:string,oid:string,subLocation:string){
        let referedType = getObjName(oid) as 'text-template'|'display'|'action'|'dialogue';
        if(!['text-template','display','action','dialogue'].includes(referedType)){
            throw new Error('Invalid object type');
        }
        if(!this.refsByOID[oid]){
            this.refsByOID[oid] = [];
        }
        if(!this.relationVars[varName]){
            this.relationVars[varName] = [];
        };
        this.refsByOID[oid].push({is:'var',prop:varName})
        this.relationVars[varName].push({
            relation:'use',
            relationWith:referedType,
            oid,
            subLocation
        })
    }
    private linkVariableDeclarator(varData:VariableDeclarator,oid:string){
        let referedType = getObjName(oid) as 'char'|'item'|'place';
        if(!['char','item','place'].includes(referedType)){
            throw new Error('Invalid object type');
        }

        if(!this.relationVars[varData.name]){
            this.relationVars[varData.name] = [];
        };
        if(!this.refsByOID[oid]){
            this.refsByOID[oid] = [];
        }
        this.refsByOID[oid].push({is:'var',prop:varData.name})
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