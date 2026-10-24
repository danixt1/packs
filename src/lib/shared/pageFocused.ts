// Gives informations about the current focused element by user.


let currentlyElement:HTMLElement|null = null;

export function setCurrentWindowToScroll(element:HTMLElement){
    currentlyElement = element;
}
export function getCurrentScrollabelWindow(){
    return currentlyElement;
}