namespace TObjectEditorPopUp {
    interface Property{
        name:string;
        title?:string;
        additionalInfo?:string;
    }
    interface PropertyString extends Property{
        type:'string';
        value?:string;
        minlength?:{value:number, errorMessage?:string};
        maxlength?:{value:number, errorMessage?:string};
        required?:{value:boolean, errorMessage?:string};
    }
    interface PropertyTextArea extends Property{
        type:'textarea';
        value?:string;
        minlength?:{value:number, errorMessage?:string};
        maxlength?:{value:number, errorMessage?:string};
        required?:{value:boolean, errorMessage?:string};
    }
    interface PropertyNumber extends Property{
        type:'number';
        value?:number;
        min?:{value:number, errorMessage?:string};
        max?:{value:number, errorMessage?:string};
        required?:{value:boolean, errorMessage?:string};
    }

    type Properties = (PropertyString | PropertyTextArea | PropertyNumber)[];
}