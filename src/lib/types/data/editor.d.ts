export interface LabelInfo{
    title?:string;
    description?:string;

}
export interface Editor{
    labelsDescription?: Record<string, LabelInfo>
}