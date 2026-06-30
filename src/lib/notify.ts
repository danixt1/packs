export interface NotifyData{
    type:'error'|'info'|'success'
    message:string
    additionalInfo?:string
    showTime:number
}

let sendToRender:(data:NotifyData)=>void = ()=>{}
export function notificationsCallbacks(fn:(dataToRender:NotifyData)=>void){
    sendToRender = fn;
}
export function showError(message:string,additionalInfo:string = '', showTime = 10){
    sendToRender({
        type:'error',message,additionalInfo,showTime
    })
}
export function showInfo(message:string,additionalInfo:string = '',showTime = 5){
    sendToRender({
        type:'info',message,additionalInfo,showTime
    })
}
export function showSucess(message:string = "Success!",additionalInfo:string = '',showTime = 3){
    sendToRender({
        type:'success',message,additionalInfo,showTime
    })
}