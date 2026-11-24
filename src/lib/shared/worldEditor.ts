import type { ActionDeclaration, Character, Collector, ConditionalList, ConditionExists, ConditionIsValid, ConditionRelational, DialogueTree, Display, EffectFomAction, EffectInterrupt, Item, Place, ProcedureDeclaration, TextTemplate, VariableDeclarator, VariableModify, VariableToGet, World } from "$lib/types/data/declarative";
import { loadWorld as loadStoredWorld } from './gameStorage';
import type { ContextEditing, Editor, LabelInfo } from "$lib/types/data/editor";
let currentEditor:null|WorldEditor = null;

export type targetsWithVar = 'character'|'temp'|'self'|'place'|'item'|'world'|'parameter'
export type ContextObjectType = 'character'|'item'|'place'|'action'|'dialogue'|'text-template'|'procedure';

type VarRelation = ({
    relation:'use'
    relationWith:'text-template'|'display'|'action'|'dialogue'|'procedure',
    subLocation:string
} | {relation:'declare', relationWith:'item'|'char'|'place'|'world', data:VariableDeclarator } 
| {relation:'modify',relationWith:'action'|'dialogue'|'procedure',subLocation:string}) & {oid:string};

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
export interface ProcedureEditor extends ProcedureDeclaration, itemWithOid{}
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
    private procedures:Record<string,ProcedureEditor> = {};
    private dialogues:Record<string,DialogueEditor> = {};
    private textTemplates:Record<string,TextTemplateEditor> = {};
    private items:Record<string,ItemEditor> = {};
    private displays:Record<string,DisplayEditor> = {};
    private worldVars:VariableDeclarator[] = [];
    private eventsInfo:Record<string,EventEditor> = {};

    private worldVersion:number[] = [1,0,0];
    private editorInfo:Editor;
    public readonly worldId?:string;


    private currentCtxs:ContextEditing[] = [];

    constructor(world:World, worldId?:string){
        this.worldId = worldId;
        this.worldName = world.name;
        this.description = world.description;
        this.worldVars = structuredClone(world.vars ?? []);
        this.worldVersion = [...(world.version ?? [1,0,0])];
        this.editorInfo = structuredClone(world.editor) || {};
        const editorInfo = world.editor || {};

        Object.entries(this.editorInfo.labelsDescription ?? []).forEach(([k,v])=>this.addLabel(k,v));

        world.vars              .forEach( e => this.linkVariableDeclarator(e,'world:root'));
        world.characters        .forEach( e => this.addCharacter(e));
        world.places            .forEach( e => this.addPlace(e));
        world.actions          .forEach( e => this.addAction(e));
        world.procedures       ?.forEach(e => this.addProcedure(e));
        world.textTemplates     .forEach( e => this.addTextTemplate(e));
        world.items             .forEach( e => this.addItem(e));
        world.dialogues         ?.forEach(e => this.addDialogue(e));
        world.displays          ?.forEach(e => this.addDisplay(e));
        this.cleanupInvalidContextMembers();

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
    public addProcedure(procedure:ProcedureDeclaration){
        const oid = `procedure:${procedure.name}`;
        if (this.procedures[procedure.name] || this.objectsByOid[oid]) throw new Error(`Procedure "${procedure.name}" already exists`);
        this.procedures[procedure.name] = {...procedure, oid};
        this.objectsByOid[oid] = procedure;
        (procedure.effects ?? []).forEach(effect => this.analyzeEffect(effect, oid, 'effects'));
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
    public addContext(ctx:ContextEditing){
        if(!this.editorInfo.ctxs){
            this.editorInfo.ctxs = [];
        }
        const ctxs = this.editorInfo.ctxs;
        if(!ctx.parent){
            ctxs.push(ctx);
            return;
        }

        const parentIndex = ctxs.findIndex((candidate) => {
            const candidatePath = candidate.parent ? `${candidate.parent}.${candidate.name}` : candidate.name;
            return candidatePath === ctx.parent;
        });
        if(parentIndex === -1){
            ctxs.push(ctx);
            return;
        }

        const parentPath = ctx.parent;
        let insertAt = parentIndex + 1;
        while(insertAt < ctxs.length){
            const candidate = ctxs[insertAt];
            const candidatePath = getContextPath(candidate);
            if(!candidatePath.startsWith(`${parentPath}.`)){
                break;
            }
            insertAt++;
        }
        ctxs.splice(insertAt, 0, ctx);
    }
    public updateContext(name:string, parent:string|null, updated:ContextEditing){
        const contexts = this.editorInfo.ctxs ?? [];
        const context = contexts.find(candidate => candidate.name === name && candidate.parent === parent);
        if(!context) throw new Error(`Context "${name}" was not found`);

        const previousPath = getContextPath(context);
        const nextPath = updated.parent ? `${updated.parent}.${updated.name}` : updated.name;
        Object.assign(context, updated);

        if(previousPath !== nextPath){
            for(const candidate of contexts){
                if(candidate.parent === previousPath){
                    candidate.parent = nextPath;
                }else if(candidate.parent?.startsWith(`${previousPath}.`)){
                    candidate.parent = `${nextPath}${candidate.parent.slice(previousPath.length)}`;
                }
            }
        }
    }
    public deleteCtx(name:string,parent:string|null = null){
        const ctxs = this.editorInfo.ctxs ?? [];
        const context = ctxs.find(candidate => candidate.name === name && candidate.parent === parent);
        if(!context){
            return;
        }
        const deletedPaths = new Set([getContextPath(context)]);
        let addedPath = true;
        while(addedPath){
            addedPath = false;
            for(const candidate of ctxs){
                if(candidate.parent && deletedPaths.has(candidate.parent)){
                    const candidatePath = getContextPath(candidate);
                    if(!deletedPaths.has(candidatePath)){
                        deletedPaths.add(candidatePath);
                        addedPath = true;
                    }
                }
            }
        }
        this.editorInfo.ctxs = ctxs.filter(candidate => !deletedPaths.has(getContextPath(candidate)));
        this.currentCtxs = this.currentCtxs.filter(candidate => !deletedPaths.has(getContextPath(candidate)));
    }
    public getObjectContexts(objectType:ContextObjectType, objectName:string){
        return (this.editorInfo.ctxs ?? [])
            .filter(context => context.objectsInCtx?.[objectType]?.includes(objectName))
            .map(getContextPath);
    }
    public setObjectContexts(
        objectType:ContextObjectType,
        objectName:string,
        selectedPaths:string[],
        previousName = objectName
    ){
        const selected = new Set(selectedPaths);
        const removePreviousName = previousName !== objectName && !this.hasObjectName(objectType, previousName);
        for(const context of this.editorInfo.ctxs ?? []){
            context.objectsInCtx ??= {};
            const objects = new Set(context.objectsInCtx[objectType] ?? []);
            if(removePreviousName){
                objects.delete(previousName);
            }
            objects.delete(objectName);
            if(selected.has(getContextPath(context))){
                objects.add(objectName);
            }
            if(objects.size){
                context.objectsInCtx[objectType] = [...objects];
            }else{
                delete context.objectsInCtx[objectType];
            }
        }
    }
    public getVariableContexts(variableName:string){
        return (this.editorInfo.ctxs ?? [])
            .filter(context => context.varsAllowed?.includes(variableName))
            .map(getContextPath);
    }
    public setVariableContexts(variableName:string, selectedPaths:string[]){
        const selected = new Set(selectedPaths);
        for(const context of this.editorInfo.ctxs ?? []){
            const variables = new Set(context.varsAllowed ?? []);
            variables.delete(variableName);
            if(selected.has(getContextPath(context))){
                variables.add(variableName);
            }
            context.varsAllowed = [...variables];
        }
    }
    public syncVariableContexts(currentNames:string[], contextsByName:Record<string,string[]>, previousNames:string[] = []){
        for(const name of new Set(currentNames)){
            this.setVariableContexts(name, contextsByName[name] ?? this.getVariableContexts(name));
        }
        for(const name of new Set(previousNames)){
            this.removeVariableContextsIfUnused(name);
        }
    }
    private removeVariableContextsIfUnused(variableName:string){
        const isStillDeclared = [
            ...Object.values(this.characters),
            ...Object.values(this.items),
            ...Object.values(this.places)
        ].some(object => object.vars.some(variable => variable.name === variableName))
            || this.worldVars.some(variable => variable.name === variableName);
        if(isStillDeclared) return;

        for(const context of this.editorInfo.ctxs ?? []){
            context.varsAllowed = (context.varsAllowed ?? []).filter(name => name !== variableName);
        }
    }
    private hasObjectName(objectType:ContextObjectType, objectName:string){
        const objects:Record<ContextObjectType, {name:string}[]> = {
            character: Object.values(this.characters),
            item: Object.values(this.items),
            place: Object.values(this.places),
            action: Object.values(this.actions),
            dialogue: Object.values(this.dialogues),
            'text-template': Object.values(this.textTemplates),
            procedure: Object.values(this.procedures)
        };
        return objects[objectType].some(object => object.name === objectName);
    }
    private cleanupInvalidContextMembers(){
        const objectNames:Record<ContextObjectType, Set<string>> = {
            character: new Set(Object.values(this.characters).map(object => object.name)),
            item: new Set(Object.values(this.items).map(object => object.name)),
            place: new Set(Object.values(this.places).map(object => object.name)),
            action: new Set(Object.values(this.actions).map(object => object.name)),
            dialogue: new Set(Object.values(this.dialogues).map(object => object.name)),
            'text-template': new Set(Object.values(this.textTemplates).map(object => object.name)),
            procedure: new Set(Object.values(this.procedures).map(object => object.name))
        };
        const variableNames = new Set([
            ...Object.values(this.characters).flatMap(object => object.vars.map(variable => variable.name)),
            ...Object.values(this.items).flatMap(object => object.vars.map(variable => variable.name)),
            ...Object.values(this.places).flatMap(object => object.vars.map(variable => variable.name))
        ]);

        for(const context of this.editorInfo.ctxs ?? []){
            context.varsAllowed = [...new Set((context.varsAllowed ?? []).filter(name => variableNames.has(name)))];
            context.objectsInCtx ??= {};
            for(const objectType of Object.keys(context.objectsInCtx)){
                if(!Object.hasOwn(objectNames, objectType)){
                    delete context.objectsInCtx[objectType];
                }
            }
            for(const objectType of Object.keys(objectNames) as ContextObjectType[]){
                const members = context.objectsInCtx[objectType] ?? [];
                const validMembers = [...new Set(members.filter(name => objectNames[objectType].has(name)))];
                if(validMembers.length){
                    context.objectsInCtx[objectType] = validMembers;
                }else{
                    delete context.objectsInCtx[objectType];
                }
            }
        }
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
            'procedure':this.procedures,
            'display':this.displays
        }
        let selected = opts[objName];
        if(!selected){
            throw new Error('Invalid data OID:"'+objName + '" not found');
        }
        const selectedKey = oid.slice(oid.indexOf(':') + 1);
        const deletedObject = selected[selectedKey] as {name?:string;vars?:VariableDeclarator[]} | undefined;
        const deletedVariableNames = getContextObjectType(objName) && ['char','item','place'].includes(objName)
            ? deletedObject?.vars?.map(variable => variable.name) ?? []
            : [];
        delete selected[selectedKey];
        delete this.objectsByOid[oid];
        this.delAllRefs(oid);
        const contextType = getContextObjectType(objName);
        if(contextType && deletedObject?.name && !this.hasObjectName(contextType, deletedObject.name)){
            for(const context of this.editorInfo.ctxs ?? []){
                const remaining = (context.objectsInCtx?.[contextType] ?? []).filter(name => name !== deletedObject.name);
                if(remaining.length){
                    context.objectsInCtx[contextType] = remaining;
                }else if(context.objectsInCtx){
                    delete context.objectsInCtx[contextType];
                }
            }
        }
        for(const variableName of new Set(deletedVariableNames)){
            this.removeVariableContextsIfUnused(variableName);
        }
    }
    public getCharacters(ignoreCtx = false):CharacterEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.characters),'character');
        }
        return Object.values(this.characters);
    }
    public getItems(ignoreCtx = false):ItemEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.items),'item');
        }
        return Object.values(this.items);
    }
    public getLabels(){
        return Object.values(this.labelslinks)
    }
    public getActions(ignoreCtx = false):ActionEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.actions),'action');
        }
        return Object.values(this.actions);
    }
    public getProcedures(ignoreCtx = false):ProcedureEditor[]{
        if(!ignoreCtx) return this.applyCtxs(Object.values(this.procedures),'procedure');
        return Object.values(this.procedures);
    }
    public getPlaces(ignoreCtx = false):PlaceEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.places),'place');
        }
        return Object.values(this.places);
    }
    public getDialogues(ignoreCtx = false):DialogueEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.dialogues),'dialogue');
        }
        return Object.values(this.dialogues);
    }
    public getTextTemplates(ignoreCtx = false):TextTemplateEditor[]{
        if(!ignoreCtx){
            return this.applyCtxs(Object.values(this.textTemplates),'text-template');
        }
        return Object.values(this.textTemplates);
    }
    public getObject(oid:string){
        return this.objectsByOid[oid];
    }

    public getWorldVars():VariableDeclarator[]{
        return this.worldVars;
    }

    public setWorldVars(variables:VariableDeclarator[]):void{
        const previousNames = this.worldVars.map(variable => variable.name);
        this.delAllRefs('world:root');
        this.possibleVarsToObject.world = new Set();
        this.worldVars = variables;
        this.worldVars.forEach(variable => this.linkVariableDeclarator(variable, 'world:root'));
        this.syncVariableContexts(this.worldVars.map(variable => variable.name), {}, previousNames);
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
            characters: this.getCharacters(true).map(({ oid: _oid, ...character }) => character),
            places: this.getPlaces(true).map(({ oid: _oid, ...place }) => place),
            items: this.getItems(true).map(({ oid: _oid, ...item }) => item),
            actions: this.getActions(true).map(({ oid: _oid, ...action }) => action),
            procedures: this.getProcedures(true).map(({ oid: _oid, ...procedure }) => procedure),
            textTemplates: Object.values(this.textTemplates).map(({ oid: _oid, ...template }) => template),
            dialogues: this.getDialogues(true).map(({ oid: _oid, ...dialogue }) => dialogue),
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
            'procedure':this.addProcedure,
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
        const currentObject = this.objectsByOid[oid] as {name?:string;vars?:VariableDeclarator[]} | undefined;
        if (objName === 'procedure' && currentObject?.name && typeof obj.name === 'string' && currentObject.name !== obj.name) {
            this.renameProcedureCalls(currentObject.name, obj.name);
        }
        const contextType = getContextObjectType(objName);
        const previousName = currentObject?.name;
        const previousContexts = contextType && previousName
            ? this.getObjectContexts(contextType, previousName)
            : [];
        const previousVariableContexts = Object.fromEntries((currentObject?.vars ?? []).map(variable => [
            variable.name,
            this.getVariableContexts(variable.name)
        ]));
        // Expensive, but if the OID of the character was updated it gonna generate duplication.
        this.deleteObject(oid);
        selected.call(this,obj);
        if(contextType && previousName && typeof obj.name === 'string' && previousContexts.length){
            this.setObjectContexts(contextType, obj.name, previousContexts, previousName);
        }
        for(const variable of obj.vars ?? []){
            if(Object.hasOwn(previousVariableContexts, variable.name)){
                this.setVariableContexts(variable.name, previousVariableContexts[variable.name]);
            }
        }
    }
    private renameProcedureCalls(previousName:string, nextName:string){
        const visit = (effects:EffectFomAction[] = []) => {
            for(const effect of effects){
                if(effect.type === 'call-procedure' && effect.procedure === previousName) effect.procedure = nextName;
                if(effect.type === 'conditional'){
                    visit(effect.onTrue);
                    visit(effect.onFalse);
                }
            }
        };
        for(const action of Object.values(this.actions)){
            visit(action.onActivate);
            visit(action.onComplete);
            visit(action.onInterrupt as EffectFomAction[] | undefined);
        }
        for(const procedure of Object.values(this.procedures)) visit(procedure.effects);
        for(const dialogue of Object.values(this.dialogues)){
            for(const node of dialogue.nodes){
                visit(node.onEnter);
                for(const choice of node.choices) visit(choice.effects);
            }
        }
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
    public getContexts(){
        return this.editorInfo.ctxs || []
    }
    public setCurrentContexts(ctxs:ContextEditing[]){
        this.currentCtxs = ctxs;
    }
    public getCurrentContexts(){
        return this.currentCtxs;
    }
    public filterVariablesByCurrentContexts<T extends {name:string}>(variables:T[]):T[]{
        const variableContexts = this.getContextsToApply().filter(context => contextAppliesTo(context, 'variables'));
        if(!variableContexts.length){
            return variables;
        }
        const allowedVariables = new Set(variableContexts.flatMap(context => context.varsAllowed ?? []));
        return variables.filter(variable => allowedVariables.has(variable.name));
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
            case 'call-procedure':
                Object.values(effect.arguments ?? {}).forEach(value => {
                    if(typeof value === 'object') this.analyzeGetter(value as VariableToGet, originOid, sublocation + '-procedure-argument');
                });
                break;
        }
    }
    private analyzeSetter(setter:VariableModify,originOid:string,subLocation:string){
        this.linkVariableSetter(setter.var.variable,originOid,subLocation);
    }
    private analyzeGetter(getter:VariableToGet,originOid:string,subLocation:string){
        if(!getter.in.endsWith('variable') || getter.in === 'parameter-variable'){
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
        if(!['action','dialogue','procedure'].includes(getObjName(originOid))){
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
            relationWith:getObjName(originOid) as 'action'|'dialogue'|'procedure',
            oid:originOid,
            subLocation
        })
    }
    private linkVariableUsage(varName:string,oid:string,subLocation:string){
        let referedType = getObjName(oid) as 'text-template'|'display'|'action'|'dialogue'|'procedure';
        if(!['text-template','display','action','dialogue','procedure'].includes(referedType)){
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
    private applyCtxs<T extends {name:string,vars?:VariableDeclarator[]}>(analyzeObjs:T[],objType:string):T[]{
        if(!this.currentCtxs.length){
            return analyzeObjs;
        }
        const contextsToApply = this.getContextsToApply();
        const objectContexts = contextsToApply.filter(context => contextAppliesTo(context, 'objects'));
        const variableContexts = contextsToApply.filter(context => contextAppliesTo(context, 'variables'));
        const visibleObjects = objectContexts.length
            ? analyzeObjs.filter(object => objectContexts.some(context => context.objectsInCtx[objType]?.includes(object.name)))
            : analyzeObjs;
        if(!variableContexts.length){
            return visibleObjects;
        }
        const allowedVariables = new Set(variableContexts.flatMap(context => context.varsAllowed ?? []));
        return visibleObjects.map(object => object.vars
            ? { ...object, vars: object.vars.filter(variable => allowedVariables.has(variable.name)) }
            : object
        );
    }
    private getContextsToApply(){
        if(!this.currentCtxs.length){
            return [];
        }
        const selectedPaths = this.currentCtxs.map(getContextPath);
        const contextsToApply = new Set(this.currentCtxs);
        for(const ctx of this.editorInfo.ctxs ?? []){
            const ctxPath = getContextPath(ctx);
            if(selectedPaths.some((selectedPath) => ctxPath.startsWith(`${selectedPath}.`))){
                contextsToApply.add(ctx);
            }
        }
        return [...contextsToApply];
    }
}
function getContextPath(ctx:ContextEditing){
    return ctx.parent ? `${ctx.parent}.${ctx.name}` : ctx.name;
}
function contextAppliesTo(ctx:ContextEditing, scope:'objects'|'variables'){
    const appliesTo = ctx.appliesTo ?? 'both';
    return appliesTo === 'both' || appliesTo === scope;
}
function getContextObjectType(oidType:string):ContextObjectType | undefined{
    const types:Record<string,ContextObjectType> = {
        char:'character',
        item:'item',
        place:'place',
        action:'action',
        dialogue:'dialogue',
        'text-template':'text-template',
        'procedure':'procedure'
    };
    return types[oidType];
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
