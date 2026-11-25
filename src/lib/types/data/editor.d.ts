export interface LabelInfo{
    /** Stable, world-wide numeric identity for this label definition. */
    _id?: number;
    title?:string;
    description?:string;

}
export interface ContextEditing{
    /** Stable, world-wide numeric identity for this editor context. */
    _id?:number
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
