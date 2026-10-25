import type { ActionDeclaration, Character, Collector, ConditionalList, ConditionExists, ConditionIsValid, ConditionRelational, DialogueTree, Display, EffectFomAction, EffectInterrupt, Item, Place, TextTemplate, VariableDeclarator, VariableModify, VariableToGet, World } from "$lib/types/data/declarative";
import { loadWorld as loadStoredWorld } from './gameStorage';
import type { LabelInfo } from "$lib/types/data/editor";
let currentEditor:null|WorldEditor = null;

export type targetsWithVar = 'character'|'temp'|'self'|'place'|'item'|'world'

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
interface EventEditor{
    sharedProperties:string[],
    called:number
}
export interface CharacterEditor extends Character, itemWithOid{}
export interface PlaceEditor extends Place, itemWithOid{}
export interface DialogueEditor extends DialogueTree, itemWithOid{}
export interface TextTemplateEditor extends TextTemplate, itemWithOid{}
export interface ItemEditor extends Item, itemWithOid{}
export interface DisplayEditor extends Display, itemWithOid{}
export interface ActionEditor extends ActionDeclaration, itemWithOid{}
export class WorldEditor {
    private listEvents:Set<string> =new Set();

    private possibleVarsToObject:Record<string,Set<string>> = {};
    private categories:string[] = [];
    private relationVars:Record<string,VarRelation[]> = {};
    private labelslinks:Record<string,LabelMapper> = {};
    private refsByOID:Record<string,{is:'label'|'var',prop:string}[]> = {};
    private objectsByOid:Record<string,any> = {};

    public worldName:string;
    public description:string;

    private characters:Record<string,CharacterEditor> = {};
    private places:Record<string,PlaceEditor> = {};
    private actions:Record<string,ActionEditor> = {};
    private dialogues:Record<string,DialogueEditor> = {};
    private textTemplates:Record<string,TextTemplateEditor> = {};
    private items:Record<string,ItemEditor> = {};
    private displays:Record<string,DisplayEditor> = {};
    private worldVars:VariableDeclarator[] = [];
    private eventsInfo:Record<string,EventEditor> = {};

    private worldVersion:number[] = [1,0,0];
    private editorInfo:World['editor'];
    public readonly worldId?:string;

    constructor(world:World, worldId?:string){
        this.worldId = worldId;
        this.worldName = world.name;
        this.description = world.description;
        this.worldVars = structuredClone(world.vars ?? []);
        this.worldVersion = [...(world.version ?? [1,0,0])];
        this.editorInfo = structuredClone(world.editor);
        const editorInfo = world.editor;
        if(editorInfo){
            Object.entries(editorInfo.labelsDescription ?? []).forEach(([k,v])=>this.addLabel(k,v));
        }
        world.vars              .forEach( e => this.linkVariableDeclarator(e,'world:root'));
        world.characters        .forEach( e => this.addCharacter(e));
        world.places            .forEach( e => this.addPlace(e));
        world.actions          .forEach( e => this.addAction(e));
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
    public addAction(action:ActionDeclaration){
        const oid = `action:${action.name}`;
        if (this.actions[action.name] || this.objectsByOid[oid]) {
            throw new Error(`Action "${action.name}" already exists`);
        }
        this.actions[action.name] = {...action, oid};
        this.objectsByOid[oid] = action;

        action.onActivate   .forEach(e => this.analyzeEffect(e,oid,'onActivate'));
        action.onComplete   .forEach(e => this.analyzeEffect(e,oid,'onComplete'));
        action.onInterrupt ?.forEach(e => this.analyzeEffect(e,oid,'onInterrupt'));
        if(action.display){
            this.extractVariablesRefInText(action.display.name)       .forEach((e)=>this.analyzeGetter(e,oid,'display-name'))
            this.extractVariablesRefInText(action.display.description).forEach((e)=>this.analyzeGetter(e,oid,'display-description'))
        }
        if(action.categories){
            this.categories = [...this.categories,...action.categories];
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
            'action':this.actions,
            'dialogue':this.dialogues,
            'text-template':this.textTemplates,
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
    public getItems():ItemEditor[]{
        return Object.values(this.items);
    }
    public getLabels(){
        return Object.values(this.labelslinks)
    }
    public getActions():ActionEditor[]{
        return Object.values(this.actions);
    }
    public getPlaces():PlaceEditor[]{
        return Object.values(this.places);
    }
    public getDialogues():DialogueEditor[]{
        return Object.values(this.dialogues);
    }
    public getTextTemplates():TextTemplateEditor[]{
        return Object.values(this.textTemplates);
    }
    public getObject(oid:string){
        return this.objectsByOid[oid];
    }

    public toWorld(): World {
        const labelsDescription = Object.fromEntries(
            Object.values(this.labelslinks).map((label) => [label.name, {
                title: label.title,
                description: label.description
            }])
        );
        const world: World = {
            name: this.worldName,
            description: this.description,
            version: [...this.worldVersion],
            vars: structuredClone(this.worldVars),
            characters: this.getCharacters().map(({ oid: _oid, ...character }) => character),
            places: this.getPlaces().map(({ oid: _oid, ...place }) => place),
            items: this.getItems().map(({ oid: _oid, ...item }) => item),
            actions: this.getActions().map(({ oid: _oid, ...action }) => action),
            textTemplates: Object.values(this.textTemplates).map(({ oid: _oid, ...template }) => template),
            dialogues: this.getDialogues().map(({ oid: _oid, ...dialogue }) => dialogue),
            displays: Object.values(this.displays).map(({ oid: _oid, ...display }) => display),
            editor: Object.keys(labelsDescription).length > 0
                ? { ...this.editorInfo, labelsDescription }
                : this.editorInfo
        };

        return world;
    }

    public updateObject(obj:itemWithOid){
        this.updateObjectWithOid(obj.oid,obj);
    }
    public updateObjectWithOid(oid:string,obj:any){
        const objName = oid.substring(0,oid.indexOf(':'));
        const options:Record<string,(data:any)=>void> = {
            'action':this.addAction,
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
    getVarsRelations(varName:string){
        return this.relationVars[varName];
    }
    public getVarsNameFrom(objName:targetsWithVar){
        let toSend:string = objName;
        if(objName === 'character' || objName === 'self'){
            toSend = 'char';
        }
        if(objName === 'temp'){
            const names = new Set<string>();
            const visit = (value:unknown) => {
                if(!value || typeof value !== 'object') return;
                if('tempVarName' in value && typeof value.tempVarName === 'string') names.add(value.tempVarName);
                Object.values(value).forEach(visit);
            };
            this.getActions().forEach(visit);
            return Array.from(names);
        }
        return Array.from(this.possibleVarsToObject[toSend] ?? []);
    }
    public getListEvents(){
        return Array.from(this.listEvents);
    }
    public getInfoFromEvent(event:string){
        return this.eventsInfo[event];
    }
    public getTextTemplateFieldsFromEvent(event:string){
        return [...new Set(this.eventsInfo[event]?.sharedProperties ?? [])];
    }
    public getCategories(){
        return this.categories;
    }
    private extractVariablesRefInText(text:string){
		const refs:VariableToGet[] = [];
		for(const [,placeholder] of text.matchAll(/(?<!\\)\$([^$\n]+)(?<!\\)\$/g)){
			const parsed = placeholder.match(/^([\w/:-]+):([\w_]+)$/);
			if(!parsed) continue;
			const [,fullLoc,varName] = parsed;
			if(!/^(?:\w+:[\w/]+-\w+|[\w/]+-\w+)$/.test(fullLoc)) continue;
			refs.push({ in:fullLoc, variable:varName } as VariableToGet);
		}
		return refs;
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
                if(typeof effect.toId !== 'string'){
                    this.analyzeGetter(effect.toId,originOid,sublocation+'-action(move)');
                }
                break;
            case 'conditional':
                effect.conditions.forEach(e =>typeof e === 'object' ? this.analyzeCondition(e,originOid,sublocation+'-action:condition') : undefined )
                effect.onFalse?.forEach(e => this.analyzeEffect(e,originOid,sublocation + '-action:effect(onFalse)'));
                effect.onTrue.forEach(e => this.analyzeEffect(e,originOid,sublocation + '-action:effect(onTrue)'));
                break;
            case 'event':
                this.listEvents.add(effect.event);
                if(!this.eventsInfo[effect.event]){
                    this.eventsInfo[effect.event] = {sharedProperties:[],called:0}
                }
                this.eventsInfo[effect.event].called ++;
                if(effect.data){
                    for(const [key,value] of Object.entries(effect.data)){
                        if(!this.eventsInfo[effect.event].sharedProperties.includes(key)){
                            this.eventsInfo[effect.event].sharedProperties.push(key);
                        }
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
        let refs =this.refsByOID[oid];

        if(!refs){
            return
        }
        for(const ref of refs){
            if(ref.is == 'var'){
                if(!this.relationVars[ref.prop]){
                    continue
                }
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
        let referedType = getObjName(oid) as 'char'|'item'|'place'|'world';
        if(!['char','item','place','world'].includes(referedType)){
            throw new Error('Invalid object type');
        }

        if(!this.relationVars[varData.name]){
            this.relationVars[varData.name] = [];
        };
        if(!this.refsByOID[oid]){
            this.refsByOID[oid] = [];
        }
        if(!this.possibleVarsToObject[referedType]){
            this.possibleVarsToObject[referedType] = new Set();
        }
        this.possibleVarsToObject[referedType].add(varData.name);
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
        currentEditor = new WorldEditor(loadWorld(worldName), worldName);
        return currentEditor;
    }
    if(!worldName){
        return currentEditor;
    }
    if(worldName !== currentEditor.worldId){
        currentEditor = new WorldEditor(loadWorld(worldName), worldName);
        return currentEditor;
    }
    return currentEditor;
}

export function replaceCurrentWorldEditor(worldName: string, world: World){
    currentEditor = new WorldEditor(world, worldName);
    return currentEditor;
}

function loadWorld(worldName:string){
    const result = loadStoredWorld(worldName);
    if (!result.ok) throw new Error(result.reason);
    return result.world;
}
