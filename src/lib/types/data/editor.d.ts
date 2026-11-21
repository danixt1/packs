export interface LabelInfo{
    title?:string;
    description?:string;

}
export interface ContextEditing{
    name:string
    title?:string
    description:string
    parent:string | null
    /** Which kinds of editor data this context constrains. Missing means both for legacy worlds. */
    appliesTo?:'both'|'objects'|'variables'
    varsAllowed:string[]
    objectsInCtx:Record<string,string[]>
}
export interface Editor{
    labelsDescription?: Record<string, LabelInfo>
    ctxs?:ContextEditing[]
}
