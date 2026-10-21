import type { GettersType } from "$lib/types/data/getters";
import type { targetsWithVar, WorldEditor } from "./worldEditor";

export type ObjectsWithVarFromGetter = targetsWithVar | 'character/place'
export type allowedObjects = 'character' | 'character/place' | 'place' | 'item' | 'event' | 'action' | 'autonomy'
export interface CtxBuilder{
    allowedGetters:GettersType[]
    allowedObjects:allowedObjects[]
    tempVars?:string[]
    actionCategories?:string[]
    editor:WorldEditor
}
export interface GetterCtx{
    setCategories(categories:string[]):GetterCtx,
    setAllowedObjects(objsLists:allowedObjects[]):GetterCtx,
    setAllowedGetters(getters:GettersType[]):GetterCtx
    varsCallback(callback:(varTo:ObjectsWithVarFromGetter)=>string[] | undefined):GetterCtx
    _getter:{
        getActionCategories():string[]
        getAllowedObjects():allowedObjects[]
        getAllowedGetters():GettersType[]
        getVars(objName:ObjectsWithVarFromGetter):string[] | undefined
    }
}
export function createGetterCtx():GetterCtx{
    let allowedGetters:GettersType[] = ['self','target','temp','runtime','world'];
    let allowedObjects:allowedObjects[] = ['character','character/place','place','item','event','action','autonomy'];
    let categories:string[] = [];
    let _getVars:(varTo:ObjectsWithVarFromGetter)=>string[] | undefined = (e)=>{};
    return {
        setCategories(c) {
            categories = c;
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