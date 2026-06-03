import path from "path"
import LICENSES from "./license/licenses"
import { capitalize, construcPkgExport, getIconShorthand, toPascalCase } from "./utils"
import { PkgExport } from "./types"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { formatCode } from "./format-code";

const SIZE_MAP = {
    "16": "1em",
    "20": "1.25em",
    "24": "1.5em",
}

// const xml = `<svg><circle cx="50" cy="50" r="40" /></svg>`;
// const doc = new DOMParser().parseFromString(xml, "image/svg+xml");

// console.log(doc.getElementsByTagName("circle")[0].getAttribute("r")); // → "40"

const updateChildAtrs = (data: HTMLElement) => {
    // console.log('children', data.childNodes[0])
    const setValues = (child: HTMLElement)=>{
        let have_modifier = false;
        if(child.getAttribute && typeof child.getAttribute === 'function'){
            const use_stroke = child.getAttribute('stroke-width')
            // console.log('use stroke', use_stroke)
            if(use_stroke){
                child.setAttribute('stroke', `var(--flx-svg-color)`)
                child.setAttribute('stroke-width', `var(--flx-svg-stroke-width)`)
                // console.log('update stroke', child)
                if(!child.getAttribute('fill')) child.setAttribute('fill', 'none')
                have_modifier = true;
            }else{
                // if(child.getAttribute('fill') === 'none') return
                // if(child.getAttribute('fill') === 'transparent') return
                // console.log('fill', child.getAttribute('fill'))
                have_modifier = (child.getAttribute('fill') || '').length>0
                if(child.getAttribute('fill') === 'currentColor'){
                    child.setAttribute('fill', `var(--flx-svg-color)`);
                }
            }

        }
        return have_modifier
    }
    const len  = data.childNodes.length
    const modifiers: boolean[] = []
    modifiers.push(setValues(data))
    for(let i=0; i<len; i++){
        const _child = data.childNodes[i]
        const child = _child as HTMLElement
        // console.log('child', child)
        modifiers.push(setValues(child))
        if(child.childNodes && child.childNodes.length>0){
            const update  = updateChildAtrs(child)
            modifiers.push(...update)
        }
    }
    return modifiers
}

const _applyAttributesToSvg = (svgText: string, setName: string)=> {
    try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(svgText, 'image/svg+xml');
        // const doc = dom.documentElement
        const svgEl = dom.getElementsByTagName('svg')[0];
        if (!svgEl) return svgText?.replace(/currentColor/g, `var(--flx-svg-color)`);
        const modifiers = updateChildAtrs(svgEl as any)
        if(modifiers.every(m=>!m)){
            svgEl.setAttribute('fill', `var(--flx-svg-color)`);
        };
    return new XMLSerializer().serializeToString(svgEl).replace(/currentColor/g, `var(--flx-svg-color)`);
    } catch (e) {
        console.error('svg parser error', e);
        return svgText?.replace(/currentColor/g, `var(--flx-svg-color)`);
    }
}

export const generateComponentTemplate = async (setName: string, variants: string[])=>{
    const libShort = capitalize(getIconShorthand(setName))
    const license = (LICENSES as any)[`icon-${setName}`]
    const _variants = variants.map(v=>v.split('.')).flat()
    const vmap = variants.map(v=>`${toPascalCase([libShort, ...v.split('.')].join('-'))}`)
    if(vmap.length===0){
        vmap.push(`${libShort}Name`)
    }
    const size = _variants.find(p=>(SIZE_MAP as any)[p]!==undefined) || "24"
    const sizeValue = (SIZE_MAP as any)[size]
    const template = `\
import { css, html, LitElement, PropertyDeclarations, unsafeCSS, svg, PropertyValues } from 'lit';\n\
import {prefixClass, addClass, hasLength} from "@fluixi/helpers";\n\
import { IconMixin as _IconMixin } from "@fluixi/helpers/components/mixins.js";\n\
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';\n\
import { unsafeHTML } from 'lit/directives/unsafe-html.js';\n\
import type { ${vmap.join(', ')} } from "icons/icon-${setName}"\n\
import {IconsMap as ${libShort}Icons} from "icons/icon-${setName}/src/imports-maps.js";\n\

const ICON_SETS: Record<string, Record<string, any>> = {\n\
    ${setName}: ${libShort}Icons\n\
};\n\

type NameMap = {\n\
    ${setName}: ${vmap.map(raw=>String.raw({raw})).join(' | ')},\n\
}\n\
const Mixin = _IconMixin<typeof LitElement, PropertyDeclarations, "${setName}", NameMap, ${license.size.length>0 ? (license.size as string[]).map(s=>`"${s}"`).join(" | "): '"string" | "number"'}, ${license.variants.length>0 ? (license.variants as string[]).map(v=>`"${v}"`).join(" | "): '"string"'}>(LitElement, {\n\
    css, unsafeCSS, html, unsafeSVG, unsafeHTML,\n\
    sets: ICON_SETS, component_name: 'icon'\n\
});\n\

export class Flx${libShort}Icon extends Mixin {\n\
    constructor(){\n\
        super();\n\
        ${license.size.length>0 ? `this.size = "${license.size[0]}"\n`: ''}\
        ${license.variants.length>0 ? `this.variant = "${license.variants[0]}"\n`: ''}\
    }
    connectedCallback() {\n\
        super.connectedCallback();\n\
    }
    render() {\n\
        const componentMainClass = prefixClass('icon', this.classPrefix);\n\
        addClass(componentMainClass, this);\n\
        const content = this.renderIcon();\n\
        if(!content) return html\`\`;\n\
        return html\`\n\
            ${"${unsafeHTML(content)}"}\n\
        \`;\n\
    }

    protected updated(_changedProperties: PropertyValues): void {\n\
        super.updated(_changedProperties);\n\
        if (_changedProperties.has('name') || _changedProperties.has('set')) this.loadIcon();\n\
    }\n\

    static styles = [\n\
        css\`:host{ display:inline-block; line-height:0; vertical-align:middle; width: ${sizeValue}; height: ${sizeValue} } svg{ display:block }\`\n\
    ]\n\
}\n\

declare global {\n\
    interface HTMLElementTagNameMap {\n\
        "flx-${libShort.toLocaleLowerCase()}-icon": Flx${libShort}Icon;\n\
    }\n\
}\n`
    // const code = await formatCode(template, {parser: 'typescript'})
    return template
}

const tagNameShortcutTransform = (name: string) =>{
    const shorthands = ["hi", "md-filled", "md-outlined", "md-round", "md-sharp", "md-two-tone", "tlr-filled", "tlr-outline"] as const;
    for(const s of shorthands){
        if(name.startsWith(s)){
            switch(s){
                case "hi":
                    if(name.startsWith("hi-16-solid")) return name.replace("hi-16-solid", "hi")
                    if(name.startsWith("hi-20-solid")) return name.replace("hi-20-solid", "hi20")
                    if(name.startsWith("hi-24-solid")) return name.replace("hi-24-solid", "hi24")
                    if(name.startsWith("hi-24-outline")) return name.replace("hi-16-outline", "hi24o")
                case "md-filled": return name.replace("md-filled", "md")
                case "md-outlined": return name.replace("md-outlined", "mdo")
                case "md-round": return name.replace("md-round", "mdr")
                case "md-sharp": return name.replace("md-sharp", "mds")
                case "md-two-tone": return name.replace("md-two-tone", "mdtt")
                case "tlr-filled": return name.replace("tlr-filled", "tlr")
                case "tlr-outline": return name.replace("tlr-outline", "tlro")
                default: return s
            }
        }
    }
    return name
    // return name.replace('hi-16-solid', 'hi')
    //         .replace('hi-20-solid', 'hi20')
    //         .replace('hi-24-solid', 'hi24')
    //         .replace('hi-24-outline', 'hi24o')
    //         .replace('md-filled', 'md')
    //         .replace('md-outlined', 'mdo')
    //         .replace('md-round', 'mdr')
    //         .replace('md-sharp', 'mds')
    //         .replace('md-two-tone', 'mdtt')
    //         .replace('tlr-filled', 'tlr')
    //         .replace('tlr-outline', 'tlro')

}

const getComponentUtil = (setName: string, name: string, variants: string[], buld_pkg = false)=>{
    const libShort = capitalize(getIconShorthand(setName))
    const names = [libShort.toLowerCase(), ...variants, name]
    const component_name = toPascalCase(names.join('-'))
    const component_tag_name = tagNameShortcutTransform(names.join('-'))
    const vPath = variants.map(v=>v.split('.')).flat()
    const file_path = path.join(setName, ...variants, name)
    const pkgs: PkgExport[] = []
    if(buld_pkg){
        pkgs.push(construcPkgExport(path.join('icons', ...variants), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['.js']}))
        const _pkgs = variants.map(v=>construcPkgExport(path.join('icons', v), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['.js']}))
        pkgs.push(..._pkgs)
    }
    return {libShort, names, component_name, component_tag_name, file_path, pkgs, vPath}
}
// this.icon = \`${_applyAttributesToSvg(content)}\`;\n\
export const generateIconComponent = async (setName: string, name: string, variants: string[], content: string)=>{
    // const _name = capitalize(getIconShorthand(name))
    // const names = variants.map(v=>[libShort.toLowerCase(), ...v.split('.'), name]).flat()
    const {libShort, names, component_name, component_tag_name, file_path, vPath} = getComponentUtil(setName, name, variants)
    // const license = LICENSES[`icon-${setName}`]
    // console.log('component_name', component_name)
    const _variants = variants.map(v=>v.split('.')).flat()
    const size = _variants.find(p=>(SIZE_MAP as any)[p]!==undefined) || "24"
    const sizeValue = (SIZE_MAP as any)[size]
    const imp_path = path.join(setName, ...vPath, name)
    const template =`\
import { css, html, LitElement, PropertyDeclarations, unsafeCSS, svg, PropertyValues } from 'lit';\n\
import { addClass } from "@fluixi/helpers/dom.js";\n\
import { prefixClass } from "@fluixi/helpers/string.js";\n\
import { IconMixin as _IconMixin } from "@fluixi/flx-base/mixins/icon.js";\n\
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';\n\
import { unsafeHTML } from 'lit/directives/unsafe-html.js';\n\

const IconMixin = _IconMixin<typeof LitElement, PropertyDeclarations, "${setName}">(LitElement, {\n\
    css, unsafeCSS, html, unsafeSVG, unsafeHTML,\n\
    component_name: 'icon'\n\
});\n\

/**
 * ## \`${component_name}\` web component \`class\`
 * Represents an SVG icon for ${name} in ${setName} icons collection.
 * Use \`size\`, \`color\`, \`stroke\`, \`strokeWidth\` attributes to set the icon properties.\
 * 
 *
 *
 * ## 🔧 Usage                                                       
 *    
 *
 * - **ES Module**
 * \`\`\`js
 * import '@fluixi/flx-icon';
 *
 * const icon = document.createElement('${component_tag_name}');
 * icon.color = '#cecece';
 * icon.size = '1em';
 * document.body.append(icon);
 * \`\`\`
 *  \-------------------------------------------------------------------------------------------------------
 *
 * - **Browser (no bundler)**
 * \`\`\`html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/flx-icon/${imp_path}.mjs"></script>
 *
 * <flx-icon icon="SVG_CONTENT_STRING"></flx-icon>
 * \`\`\`
 * 
 * \-------------------------------------------------------------------------------------------------------
 * 
 * &copy;  2025 FLUIXI
 *
 * @summary Displays an SVG icon.
 * @author Ibrahima Touré
 * @version 1.0.0
 * @copyright &copy;  2025 FlUIXI
 * @license Proprietary
 * @name flx-icon
 * @property {string} name - Icon name
 * @property {string} lib - Icon Library Name
 * @property {string} icon - Icon svg code
 * @property {string} size - Icon size
 * @property {string} variant - Icon variant
 * @property {string} color - Icon color used for fill or stroke if stroke is not set
 * @property {string} stroke - Icon stroke used for stroke color
 * @property {string} strokeWidth - Icon stroke width
*/
export class ${component_name} extends IconMixin {\n\
    static properties: PropertyDeclarations = {}
    constructor(){\n\
        super();\n\
        this.icon = "";\n\
        this.size = "${size}"\n
    }
    connectedCallback() {\n\
        super.connectedCallback();\n\
    }
    disconnectedCallback() {\n\
        super.disconnectedCallback()
    }\n\
    render() {\n\
        const componentMainClass = prefixClass('icon', this.classPrefix);\n\
        addClass(componentMainClass, this);\n\
        return html\`\n\
            ${_applyAttributesToSvg(content, setName)}
        \`;\n\
    }
    protected updated(_changedProperties: PropertyValues): void {\n\
        super.updated(_changedProperties);\n\
        if (_changedProperties.has("color") || _changedProperties.has("size") || _changedProperties.has("strokeWidth") || _changedProperties.has("stroke")) {
            this.applyStyles();\n\
        }\n\
    }\n\

    static styles = [\n\
        css\`:host{\n\
            --flx-svg-color: currentColor;\n\
            --flx-svg-stroke-width: 1;\n\
            --flx-svg-size: ${sizeValue};\n\
            display:inline-block;\n\
            line-height:0;\n\
            vertical-align:middle;\n\
            align-items:center;\n\
            text-align:center;\n\
            width: var(--flx-svg-size);\n\
            height: var(--flx-svg-size);\n\
        }\n\
        svg{ display:block }\`\n\
    ]\n\
}\n\

declare global {\n\
    interface HTMLElementTagNameMap {\n\
        "${component_tag_name}": ${component_name};\n\
    }\n\
}\n`
    const definition = generateIconComponentDefinition(setName, name, variants)
    const {template: react_component, pkgs} = generateReactComponent(setName, name, variants)
    const web_component_type = generateWebComponentTemplateType(setName, name, variants)
    const react_component_type = generateReactTemplateType(setName, name, variants)
    const index = `export { ${component_name} } from "./${component_name}.js"\n`
    // const code = await formatCode(template, {parser: 'typescript'})
    return {template, file_path, filename: `${component_name}.ts`, definition, definitionFileName: `${name}.register.ts`, index, component_name, component_tag_name, setName, libShort, react_component, name, react_pkgs: pkgs, web_component_type, react_component_type}
}


export const generateIconComponentDefinition = (setName: string, name: string, variants: string[])=>{
    const {libShort, names, component_name, component_tag_name} = getComponentUtil(setName, name, variants)
    const template = `\
import { ${component_name} } from "./${component_name}.js";\n\

if(typeof window !== 'undefined' && !window.customElements.get("${component_tag_name}")) {\n\
    window.customElements.define("${component_tag_name}", ${component_name});\n\
}\n`
    return template
}


export const generateReactComponent = (setName: string, name: string, variants: string[])=>{
    const {libShort, names, component_name, component_tag_name, file_path, pkgs} = getComponentUtil(setName, name, variants, true)
    const template = `
import React from 'react';\n\
import {createComponent} from '@lit/react';\n\
import {${component_name} as ${component_name}WC} from '@fluixi/flx-icon/${file_path}/${component_name}.js';\n\
import "@fluixi/flx-icon/${file_path}/${name}.register.js"
export const ${component_name} = createComponent({\n\
    tagName: "${component_tag_name}",\n\
    elementClass: ${component_name}WC,\n\
    react: React,\n\
    displayName: "${component_name}"\n\
});\n\
export default ${component_name}`
    return {template, pkgs}
}


export const generateWebComponentTemplateType = (setName: string, name: string, variants: string[])=>{
    const {libShort, names, component_name, component_tag_name, vPath} = getComponentUtil(setName, name, variants)
    const imp_path = path.join(setName, ...vPath, name)

    const template = `\
import { LitElement, PropertyDeclarations } from 'lit';\n\
declare const IconMixin: typeof LitElement & import("@fluixi/flx-base/mixins/types").IMixinConstructor<import("@fluixi/flx-base/mixins/base").IBaseMixin> & import("@fluixi/flx-base/mixins/base").IBaseMixin & import("@fluixi/flx-base/mixins/types").IBaseProps & import("@fluixi/flx-base/mixins/types").IMixinConstructor<import("@fluixi/flx-base/mixins/icon.js").IIconMixin<any, any, any, any>> & import("@fluixi/flx-base/mixins/icon.js").IIconMixin<any, any, any, any> & {\n\
    name: "${name}";\n\
    lib: any;\n\
    size: any;\n\
    icon: string | null;\n\
    variant: any;\n\
    color: string | null;\n\
    stroke: string | null;\n\
    strokeWidth: string | number | null;\n\
};\n\

/**
 * ## \`${component_name}\` web component \`class\`
 * Represents an SVG icon for \`${name}\` in \`${setName}\` icons collection.
 * Use \`size\`, \`color\`, \`stroke\`, \`strokeWidth\` attributes to set the icon properties.\
 * 
 *
 *
 * ## 🔧 Usage                                                       
 *    
 *
 * - **ES Module**
 * \`\`\`js
 * import '@fluixi/flx-icon';
 *
 * const icon = document.createElement('${component_tag_name}');
 * icon.color = '#cecece';
 * icon.size = '1em';
 * document.body.append(icon);
 * \`\`\`
 * \-------------------------------------------------------------------------------------------------------
 *
 * - **Browser (no bundler)**
 * \`\`\`html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/flx-icon/${imp_path}.mjs"></script>
 *
 * <flx-icon icon="SVG_CONTENT_STRING"></flx-icon>
 * \`\`\`
 * 
 * \--------------------------------------------------------------------------------------------------------
 * 
 * &copy;  2025 FLUIXI
 *
 * @summary Displays an SVG icon.
 * @author Ibrahima Touré
 * @version 1.0.0
 * @copyright &copy;  2025 FLUIXI INC
 * @license Proprietary
 * @name flx-icon
 * @property {string} lib - Icon Library \`${setName}\`
 * @property {string} icon - Icon svg code
 * @property {string} size - Icon size
 * @property {string} color - Icon color used for fill or stroke if stroke is not set
 * @property {string} stroke - Icon stroke used for stroke color
 * @property {string} strokeWidth - Icon stroke width
*/
export declare class ${component_name} extends IconMixin {\n\
    static properties: PropertyDeclarations;\n\
    constructor();\n\
    connectedCallback(): void;\n\
    disconnectedCallback(): void;\n\
    render(): import("lit").TemplateResult<1>;\n\
    static styles: import("lit").CSSResult[];\n\
}\n\
declare global {\n\
    interface HTMLElementTagNameMap {\n\
        "${component_tag_name}": ${component_name};\n\
    }\n\
}\n\
export {};\n\
    `
    return template
}
export const generateReactTemplateType = (setName: string, name: string, variants: string[])=>{
    const {libShort, names, component_name, component_tag_name, file_path} = getComponentUtil(setName, name, variants)
    const template = `\
import { ${component_name} as ${component_name}WC } from "@fluixi/flx-icon/${file_path}/${component_name}.js";
import "@fluixi/flx-icon/${file_path}/${name}.js";
export declare const ${component_name}: import("@lit/react").ReactWebComponent<${component_name}WC, {}>;
export default ${component_name};
    `
    return template
}