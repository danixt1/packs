export interface Switch {
    name?:string;
    isPageEnabled:boolean;
    enablePage:() => void;
}
/**
 * A very simple page switcher that allows only one page to be enabled at a time.
 * This is useful for cases where you have multiple pages that can be opened, but only one should be active at a time.
 * The page switcher does not handle any UI logic, it simply provides a way to manage the state of the pages.
 */
export function createPageSwitch(){
    let internal = {
        enable(switchToEnable:Switch){
            if(this.activeSwitch && this.activeSwitch !== switchToEnable){
                this.activeSwitch.isPageEnabled = false;
            }
            switchToEnable.isPageEnabled = true;
            this.activeSwitch = switchToEnable;
        },
        switches:[] as Switch[],
        activeSwitch:null as Switch | null,
        createSwitch(name?:string){
            let pageSwitch:Switch = {
                name,
                isPageEnabled:false,
                enablePage:()=>{
                    this.enable(pageSwitch);
                }
            };
            this.switches.push(pageSwitch);
            pageSwitch = this.switches[this.switches.length - 1];
            if(this.activeSwitch === null){
                this.activeSwitch = pageSwitch;
                pageSwitch.isPageEnabled = true;
            }
            return pageSwitch;
        },
        getActiveSwitch(){
            return this.activeSwitch;
        },
        enableSwitchByName(name:string){
            const switchToEnable = this.switches.find(s => s.name === name);
            if(switchToEnable){
                this.enable(switchToEnable);
                return true;
            }
            return false;
        }
    }
    return internal;
}