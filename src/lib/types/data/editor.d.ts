interface LabelInfo{
    title?:string;
    description?:string;

}
interface Editor{
    labelsDescription?: Record<string, LabelInfo>
}