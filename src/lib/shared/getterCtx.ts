import type { GettersType } from "$lib/types/data/getters";
import type { targetsWithVar, WorldEditor } from "./worldEditor";

export type ObjectsWithVarFromGetter = targetsWithVar | 'character/place'|'self'
export type ObjectsWithMetadata = 'place'|'item'|'character'|'action'|'world'|'autonomy'
export type allowedObjectsStructures = 'character' | 'character/place' | 'place' | 'item' | 'event' | 'action' | 'autonomy'
export interface CtxBuilder{
    allowedGetters:GettersType[]
    allowedObjects:allowedObjectsStructures[]
    tempVars?:string[]
    selfVars?:string[]
    selfMetadata?:ObjectsWithMetadata
    actionCategories?:string[]
    editor:WorldEditor
}
export interface GetterCtx{
    setCategories(categories:string[]):GetterCtx,
    setAllowedObjects(objsLists:allowedObjectsStructures[]):GetterCtx,
    setAllowedGetters(getters:GettersType[]):GetterCtx
    varsCallback(callback:(varTo:ObjectsWithVarFromGetter)=>string[] | undefined):GetterCtx
    setSelfMetadata(objName:ObjectsWithMetadata | null):GetterCtx
    _getter:{
        getSelfMetadata():ObjectsWithMetadata | null
        getActionCategories():string[]
        getAllowedObjects():allowedObjectsStructures[]
        getAllowedGetters():GettersType[]
        getVars(objName:ObjectsWithVarFromGetter):string[] | undefined
    }
}
export function createGetterCtx():GetterCtx{
    let allowedGetters:GettersType[] = ['self','target','temp','runtime','world'];
    let allowedObjects:allowedObjectsStructures[] = ['character','character/place','place','item','event','action','autonomy'];
    let selfMetadata:ObjectsWithMetadata | null = null;
    let categories:string[] = [];
    let _getVars:(varTo:ObjectsWithVarFromGetter)=>string[] | undefined = (e)=>{};
    return {
        setCategories(c) {
            categories = c;
            return this;
        },
        setSelfMetadata(objName) {
            selfMetadata = objName;
            return this;
        },
        setAllowedObjects(objsLists) {
            allowedObjects = objsLists;
            return this;
        },
        setAllowedGetters(getters:GettersType[]){
            allowedGetters = getters;
            return this;
        },
        varsCallback(callback:(varTo:ObjectsWithVarFromGetter)=>string[] | undefined){
            _getVars = callback;
            return this;
        },
        _getter:{
            getSelfMetadata() {
                return selfMetadata
            },
            getActionCategories() {
                return categories;
            },
            getAllowedObjects() {
                return allowedObjects;
            },
            getAllowedGetters(){
                return allowedGetters;
            },
            getVars(objName:ObjectsWithVarFromGetter){
                return _getVars(objName);
            }
        }
    }
}