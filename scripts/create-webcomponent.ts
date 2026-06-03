import { capitalize } from "./utils";

const createCompoennt = async (name: string, prefix: string)=>{
    const lit = await import('lit' as any);
    const pascalName = `${capitalize(prefix)}${capitalize(name)}`
    const component = `\
    export class ${pascalName} extends LitElement {
        constructor() {
            super();
        }
        connectedCallback() {
            super.connectedCallback();
        }
        disconnectedCallback() {
            super.disconnectedCallback();
        }
        render() {
            return html\`<slot></slot>\`;
        }
    }`
}