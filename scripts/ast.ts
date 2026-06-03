import path from "path"
import { deduplicateByValue, objectFromArrayKeys, pick, toJSONString, uniqBy } from "./utils"

type ExportType = 'map' | 'default' | 'named' | 'variable' | 'const' | 'types'
type ImportType = 'named' | 'default' | 'types'
type Iparams = {file: string, path: string,  text: string, isDefault?: boolean, key?: string, selector?: string, from?: string, default?: boolean, registry?: string[]}
export interface AstExportOption{
    exportType?: ExportType
    exportParams?: Iparams[]
    exportFrom?: string   
    isType?: boolean     
}

export interface AstImportOptions{
    importType?: ImportType
    importParams?: Iparams[]
    importFrom?: string,
    isType?: boolean,
    isDefault?: boolean 
}

export interface ExportResult{
    code: string;
    type: ExportType;
    registry?: string[],
    selector?: string
}
export interface ImportResult{
    code: string;
    type: ImportType;
}
export interface AstCode{
    key: string, 
    value: string, 
    from: string, 
    lib: string, 
    path: string, 
    name: string, 
    types: string[],
    exportOptions: AstExportOption[],
    importOptions: AstImportOptions[]
}

interface ConstructOption {
    from?: string, 
    key?: string, 
    selector?: string, 
    default?: boolean, 
    file: string | null, 
    path: string | null,
    registry?: string[]
    parents?: string[]
}

const exports_cache: string[] = []
export const exportOption = (value: any, type: ExportType, opt: ConstructOption = {file: null, path: null, registry: [], parents: []})=>{
    const {from, key, selector, default: v, file, path, registry, parents} = opt
    let data: any[] = [];
    if(!value) return null;
    if(typeof value === 'string'){
        data = [{text: value, key, selector, from, isDefault: v, file: file, path, registry, parents}]
    }else if(typeof value === 'object' && Array.isArray(value)){
        data = [value]
    }else{
        data = value
    }
    // const hash = JSON.stringify(data)
    // if(exports_cache.includes(hash)) return null;
    // exports_cache.push(hash)
    // if(registry && registry.length>0){
    //     const tf = `${type}${selector}${registry.join('')}`
    //     if(exports_cache.includes(tf)) return null;
    //     exports_cache.push(tf)

    // }
    return {
        exportParams: data,
        exportType: type,
        exportFrom: from
    } as AstExportOption
}

const imports_cache: string[] = []
export const importOption = (value: any, type: ImportType, opt: ConstructOption = {file: null, path: null, registry: []})=>{
    let data: any[] = [];
    const {from, key, selector, default: v, file, path, registry} = opt
    if(!value) return null;
    if(typeof value === 'string'){
        data = [{text: value, key, selector, from, isDefault: v, file, path, registry}]
    }else if(typeof value === 'object' && Array.isArray(value)){
        data = [value]
    }else{
        data = value
    }
    // const hash = JSON.stringify(data)
    // if(imports_cache.includes(hash)) return null;
    // imports_cache.push(hash)
    return {
        importParams: data,
        importType: type,
        importFrom: from
    } as AstImportOptions
}


export interface CodeResult {
    code: string;
    type: string;
    selector?: string;
    from?: string;
    fullCode: string;
    file: string
    path: string,
    registry: string[]
}


export const handleExport = (entry: AstExportOption): CodeResult[] => {
    const data: CodeResult[] = []
    if(!(entry.exportParams && entry.exportParams.length>0)){
        return data
    }
    const isDefined = (param: any)=>{
        if(typeof param === "undefined" || param === null){
            return false
        }
        return true
    }
    const getFrom = (param: any)=>{
        if(param.from && param.from.length>0){
            return `${param.from}`
        }
        return entry.exportFrom ? entry.exportFrom : ''
    }

    switch(entry.exportType){
        case 'map':
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                const code = `${p.key}: ${p.text}`
                // const fullCode = `export const ${p.selector} = {${code}}`
                const fullCode = `const ${p.selector} = {${code}}`
                const value: CodeResult = {...(pick(p, ['selector', 'file', 'path', 'registry'])), code, type: 'map', fullCode}
                if(p.selector){
                    value.fullCode = `const ${p.selector} = {${code}}`
                    // value.fullCode = `export const ${p.selector} = {${code}}`
                }
                data.push(value);
            }
            // const codes = entry.exportParams.map(p=>{
            //     const code = `${p.key}: ${p.text}`
            //     const fullCode = `export const ${p.selector} = {${code}}`
            //     const value: CodeResult = {...(pick(p, ['selector', 'file', 'path', 'registry'])), code, type: 'map', fullCode}
            //     if(p.selector){
            //         value.fullCode = `export const ${p.selector} = {${code}}`
            //     }
            //     return value;
            // })
            // data.push(...codes)
            break;
        case 'default':
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                if(!isDefined(p.text)) continue
                const code = !p.isDefault ? `${p.text}`:`{ default as ${p.text} }`
                const fullCode = `export ${code} from "${getFrom(p)}"`
                const value: CodeResult = {...(pick(p, ['selector', 'file', 'path', 'registry'])), code, type: 'default', fullCode, from: getFrom(p)}
                data.push(value);
            }
            // const codes_default = entry.exportParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...codes_default)
            break;
        case 'named':
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                if(!isDefined(p.text)) continue
                const code = `${p.text}`
                const fullCode = `export ${entry.isType ? 'type ': ''}${code} from "${getFrom(p)}"`
                const value: CodeResult = {...(pick(p, [entry.isType ? 'selector':'', 'file', 'path', 'registry'])), code, type: entry.isType ? 'types' : 'named', fullCode, from: getFrom(p)}
                data.push(value);
            }
            // const codes_named = entry.exportParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...codes_named)
            break;
        case 'variable':
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                if(!isDefined(p.text)) continue
                const code = `${p.text}`
                const value: CodeResult = {...(pick(p, ['selector', 'file', 'path', 'registry'])), code, type: 'variable', fullCode: code, selector: {...p}.selector}
                if(p.selector){
                    value.fullCode = `const ${p.selector} = {${code}}`
                    // value.fullCode = `export const ${p.selector} = {${code}}`
                }
                data.push(value);
            }
            // const codes_variable = entry.exportParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...codes_variable)
            break;
        case 'const':
            // console.log('handle const', entry.e)
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                if(!isDefined(p.text) || !isDefined(p.selector)) continue
                const extra = pick(p, ['selector', 'file', 'path', 'registry'])
                if(p.isDefault){
                    const _code = `export default ${p.selector ?? p.text};`
                    const _fullCode = `export default ${p.selector ?? p.text};`
                    const def: CodeResult = {...extra, code: _code, fullCode: _fullCode, type: 'const'}
                    data.push(def)
                    // continue
                }
                const code = `export {${p.text}}`
                const fullCode = `export {${p.text}}`
                // const code = `export const ${p.selector} = ${p.text}`
                // const fullCode = `export const ${p.selector} = ${p.text}`
                const value: CodeResult = {...extra, code, type: 'const', fullCode, selector: {...p}.selector}
                data.push(value);

            }
            // const codes_const = entry.exportParams.map(p=>{
            //     return value
            // }).filter(f=>f!==null).flat()
            // data.push(...codes_const)
            break;
        case 'types':
            for(let i=0; i<entry.exportParams.length; i++){
                const p = entry.exportParams[i]
                if(!isDefined(p.text)) continue
                if(p.isDefault){
                    if(!isDefined(p.selector)) continue
                    const code = `${p.text}`
                    const fullCode = `export type ${p.selector} = ${code}`
                    const value: CodeResult = {...(pick(p, ['selector', 'file', 'path', 'registry'])), code, type: 'types', fullCode, selector: {...p}.selector}
                    data.push(value);
                }else{
                    const code = `${p.text}`
                    const fullCode = `export type {${code}} from "${getFrom(p)}"`
                    const value: CodeResult = {...(pick(p, ['file', 'path', 'registry'])), code, type: 'types', fullCode, from: getFrom(p)}
                    // return value;
                    data.push(value);
                }
            }
            // const codes_types = entry.exportParams.slice().map(p=>{
            // }).filter(f=>f!==null)
            // data.push(...codes_types)

            break;
        default:
            break;
    }
    return data
}


export const handleImport = (entry: AstImportOptions): CodeResult[] => {
    const data: CodeResult[] = []
    if(!(entry.importParams && entry.importParams.length>0 && entry.importType)){
        return data
    }
    const isDefined = (param: any)=>{
        if(typeof param === "undefined" || param === null){
            return false
        }
        return true
    }
    const getFrom = (param: any)=>{
        if(param.from && param.from.length>0){
            return `${param.from}`
        }
        return entry.importFrom ? entry.importFrom : ''
    }
    switch(entry.importType){
        case 'named':
            for(let i=0; i<entry.importParams.length; i++){
                const p = entry.importParams[i]
                if(!isDefined(p.text)) continue
                const code = `${p.text}`
                const fullCode = `import {${code}} from "${getFrom(p)}"`
                const value: CodeResult = {...(pick(p, ['file', 'path', 'registry'])), code, type: 'named', fullCode: fullCode, from: getFrom(p)}
                data.push(value)
            }
            // const named_codes = entry.importParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...named_codes)
            break;
        case 'default':
            for(let i=0; i<entry.importParams.length; i++){
                const p = entry.importParams[i]
                if(!isDefined(p.text)) continue
                const code = !p.isDefault ? `${p.text}`:`{ default as ${p.text} }`
                const fullCode = `import ${code} from "${getFrom(p)}"`
                const value: CodeResult = {...(pick(p, ['file', 'path', 'registry'])), code, type: 'default', fullCode: fullCode, from: getFrom(p)}
                data.push(value)
            }
            // const default_codes = entry.importParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...default_codes)
            break;
        case 'types':
            for(let i=0; i<entry.importParams.length; i++){
                const p = entry.importParams[i]
                if(!isDefined(p.text)) continue
                const code = `${p.text}`
                const fullCode = `import type {${code}} from "${getFrom(p)}"`
                const value: CodeResult = {...(pick(p, ['file', 'path', 'registry'])), code, type: 'types', fullCode: fullCode, from: getFrom(p)}
                data.push(value)
            }
            // const types_codes = entry.importParams.map(p=>{
            //     return value;
            // }).filter(f=>f!==null)
            // data.push(...types_codes)
            break;
        default:
            break
    }
    return data
}

const makeUniqueItems = <T extends {code: string}, K extends keyof T>(values: T[], key: K, merged_named: {values: string[], [key]: string}[])=>{
    for(const {[key]: from, code} of values){
        const idx = merged_named.findIndex(f=>f[key as string] === from)
        if(idx === -1){
            merged_named.push({values: [code], [key]: (from! as string)})
        }else{
            merged_named[idx].values.push(code)
        }
    }
    return merged_named
}


// Add this to your utils.ts file
const toFilePath = (value: CodeResult)=>{
    return path.join(value.path, value.file)
}
const uniqueFiles = (files: CodeResult[])=>{
    return Array.from(new Set(files.slice().map(t=>toFilePath(t))))
}

export const groupExports = (_exports_data: CodeResult[])=>{
    // console.time('groupExports')
    const exports_data = deduplicateByValue(_exports_data.slice())
    const  result: ExportResult[] = []
    const _consts = exports_data.slice().filter(e=>e.type === 'const')
    const _types = exports_data.slice().filter(e=>e.type === 'types' && ((e.from && e.from.length>0) || (e.selector && e.selector.length>0)))
    const normal_types = exports_data.slice().filter(t=>t.type === 'types' && !t.from && !t.selector)
    
    const _named = exports_data.slice().filter(e=>e.type.startsWith('named') && e.from && e.from.length>0)
    const normal_named = exports_data.slice().filter(e=>e.type.startsWith('named') && !e.from)
    
    const _map = exports_data.slice().filter(e=>e.type.startsWith('map') && e.selector && e.selector.length>0)
    const normal_map = exports_data.slice().filter(e=>e.type.startsWith('map') && !e.selector)

    
    const _default = exports_data.slice().filter(e=>e.type === 'default' && e.from && e.from.length>0)
    const normal_default = exports_data.slice().filter(e=>e.type === 'default' && !e.from)
    
    const _variables = exports_data.slice().filter(e=>e.type === 'variable' && ((e.from && e.from.length>0) || (e.selector && e.selector.length>0)))
    const normal_variables = exports_data.slice().filter(e=>e.type === 'variable' && !e.from && !e.selector)

    if(_consts.length>0){
        const files = uniqueFiles(_consts)
        for(const file of files){
            const same_file = deduplicateByValue(_consts.slice().filter(f=>toFilePath(f)===file));
            // console.log('const is', same_file)
            if(same_file.length===0) continue
            result.push({
                code: Array.from(new Set(same_file.slice().map(f=>f.fullCode))).join('\n'),
                registry: same_file.slice().map(f=>f.registry).flat(),
                selector: same_file[0].selector!,
                type: 'const',
            })
        }
    }
    const e = uniqueFiles(_types)
    for(const file of e){
        const types_with_from = makeUniqueItems(_types.slice().filter(t=>t.from && !(t.selector && t.selector.length>0) && path.join(t.path, t.file)===file), 'from', [])
        const types_with_selector = makeUniqueItems(_types.slice().filter(t=>t.selector && t.selector.length>0 && path.join(t.path, t.file)===file), 'selector', [])
        if(types_with_selector.length>0){
            result.push({
                code: `export type ${types_with_selector[0].selector} = ${types_with_selector.slice().map(f=>f.values.join(' | ')).join(' | ')}`,
                type: 'types',
            })
        }
        if(types_with_from.length>0){
            // console.log('types', types_with_from)
            types_with_from.forEach(t=>{
                result.push({
                    code: `export type {${t.values.join(', ')}} from "${t.from}"`,
                    type: 'types',
                })
                
            })
        }
    }
    const merged_named = makeUniqueItems(_named, 'from', [])
    if(merged_named.length>0){
        result.push({
            code: merged_named.map(f=>(`export {${f.values.join(', ')}} from "${f.from}"`)).join('\n'),
            type: 'named',
        })
    }
    if(_default.length>0){
        result.push({
            code: Array.from(new Set(_default.map(f=>f.fullCode))).join('\n'),
            type: 'default',
        })
    }
    if(_variables.length>0){
        const variables_with_from = _variables.slice().filter(v=>v.from && v.from.length>0)
        const variables_with_selector = _variables.slice().filter(v=>v.selector && v.selector.length>0)
        const merged_variables_with_from = makeUniqueItems(variables_with_from, 'from', [])
        const merged_variables_with_selector = makeUniqueItems(variables_with_selector, 'selector', [])
        if(merged_variables_with_from.length>0){
            result.push({
                code: merged_variables_with_from.map(f=>(`export {${f.values.join(', ')}} from "${f.from}"`)).join('\n'),
                type: 'variable',
            })
        }
        if(merged_variables_with_selector.length>0){
            // console.log('vars', merged_variables_with_selector)
            result.push({
                code: merged_variables_with_selector.map(f=>(`const ${f.selector} =  {${f.values.join(', ')}}`)).join('\n'),
                type: 'variable',
            })
        }
    }
    if(_map.length>0){
        const merged_map = makeUniqueItems(_map, 'selector', [])
        if(merged_map.length>0){
            result.push({
                code: merged_map.map(f=>`const ${f.selector} =  {${f.values.join(', ')}}`).join('\n'),
                type: 'map',
            })
        }
    }
    // console.timeEnd('groupExports')

    return {values: result, named: normal_named, default: normal_default, variables: normal_variables, types: normal_types, map: normal_map}


}

export const groupImports = (_imports_data: CodeResult[])=>{
    const imports_data = deduplicateByValue(_imports_data)
    const  result: ImportResult[] = []
    const _types = imports_data.slice().filter(e=>e.type === 'types' && e.from && e.from.length>0)
    const normal_types = imports_data.slice().filter(t=>t.type === 'types' && !t.from)
    
    const _named = imports_data.slice().filter(e=>e.type.startsWith('named') && e.from && e.from.length>0)
    const normal_named = imports_data.slice().filter(e=>e.type.startsWith('named') && !e.from)
    
    const _default = imports_data.slice().filter(e=>e.type === 'default' && e.from && e.from.length>0)
    const normal_default = imports_data.slice().filter(e=>e.type === 'default' && !e.from)

    const merged_types = makeUniqueItems(_types.slice(), 'from', [])
    if(merged_types.length>0){
        result.push({
            code: merged_types.map(t=>`import type {${t.values.join(', ')}} from "${t.from}"`).join('\n'),
            type: 'types',
        })
    }
    const merged_named = makeUniqueItems(_named, 'from', [])
    if(merged_named.length>0){
        result.push({
            code: merged_named.map(f=>`import {${f.values.join(', ')}} from "${f.from}"`).join('\n'),
            type: 'named',
        })
    }
    if(_default.length>0){
        result.push({
            code: _default.map(f=>f.fullCode).join('\n'),
            type: 'default',
        })
    }

    return {values: result, named: normal_named, default: normal_default, types: normal_types}

}
export const transformAstCode = (entry: AstCode)=>{
    console.time('transform ast code')
    const exports_results: CodeResult[] = []
    const imports_results: CodeResult[] = []
    if(entry.exportOptions.length>0){
        console.time(`handle export ${entry.exportOptions.length}`)
        for(let i=0; i<entry.exportOptions.length; i++){
            const export_option = entry.exportOptions[i]
            // if(!export_option) continue
            const data_export = handleExport(export_option)
            exports_results.push(...data_export)
        }
        console.timeEnd(`handle export ${entry.exportOptions.length}`)
    }
    
    if(entry.importOptions.length>0){
        // console.time(`handle import ${entry.importOptions.length}`)
        for(let i=0; i<entry.importOptions.length; i++){
            const import_option = entry.importOptions[i]
            const data_import = handleImport(import_option)
            imports_results.push(...data_import)
        }
        // console.timeEnd(`handle import ${entry.importOptions.length}`)
    }
    
    console.timeEnd('transform ast code')
    return {
        imports_results,
        exports_results
    }
}

export const transformAstNodes = (ast: AstCode[])=>{
    // let export_values: {file: string, data: ExportResult[]}[] = [];
    // let import_values: {file: string, data: ImportResult[]}[] = [];
    // const ast = deduplicateByValue(_ast)
    const exports_results: CodeResult[] = []
    const imports_results: CodeResult[] = []
    console.log(`prpepare transform ${ast.length} ast nodes`)
    console.time(`${ast.length} ast nodes transformed`)
    for(const entry of ast){
        const data = transformAstCode(entry)
        exports_results.push(...data.exports_results.slice())
        imports_results.push(...data.imports_results.slice())
        // console.log(`entry transformaed`)
    }
    console.timeEnd(`${ast.length} ast nodes transformed`)
    // console.log('code tranformed')
    // const m = exports_results.slice().filter(e=>e.type==='const')
    // if(m.length>0){
    //     console.log('const', m)
    // }
    // console.log('m', m)
    console.time(`exported files: ${exports_results.length} imported files: ${imports_results.length}`)
    const uniqueExportedFiles = Array.from(new Set(exports_results.slice().map(e=>`${path.join(e.path, e.file)}`)))
    const export_values = uniqueExportedFiles.map(file=>{
        const items = exports_results.slice().filter(e=>`${path.join(e.path, e.file)}` === file)
        const {values: export_result} = groupExports(items)
        return {file, data: export_result}
    })
    const uniqueImportedFiles = Array.from(new Set(imports_results.slice().map(e=>`${path.join(e.path, e.file)}`)))
    const import_values = uniqueImportedFiles.map(file=>{
        const items = imports_results.slice().filter(e=>`${path.join(e.path, e.file)}` === file)
        const {values: import_result} = groupImports(items)
        return {file, data: import_result}
    })
    console.timeEnd(`exported files: ${exports_results.length} imported files: ${imports_results.length}`)

    // const {values: exports_result} = groupExports(exports_results)
    // export_values.push(...exports_result)
    // const {values: imports_result} = groupImports(imports_results)
    // import_values.push(...imports_result)
    // console.log('er', exports_results)
    return {
        export_values,
        import_values,
        exports_results,
        imports_results
    }
}

export const importToString = (import_values: ImportResult[])=>{
    let code: string = '';
    const top_imports = import_values.filter(i=>i.type === 'default')
    const other_imports = import_values.filter(i=>i.type !== 'default')
    if(top_imports.length>0){
        code = top_imports.map(i=>i.code).join('\n')
    }
    if(other_imports.length>0){
        code += `\n${other_imports.map(i=>i.code).join('\n')}`
    } 
    return code 
}

export const exportToString = (export_values: ExportResult[], file?: string)=>{
    // let code: string = export_values.map(i=>i.code).join('\n');
    let code: string = '';
    const top_exports = export_values.slice().filter(i=>!i.code.startsWith('export default'))
    const other_exports = export_values.slice().filter(i=>i.code.startsWith('export default'))
    const registry = Array.from(new Set(export_values.slice().map(e=>({registry: e.registry ?? [], selector: e.selector!})))).filter(e=>e.registry.length>0 && e.selector.length>0)
    // console.log('registry file', file)
    // if(registry.length>0){
    //     console.log('export registry', registry)
    // }
    if(top_exports.length>0){
        code+=top_exports.map(i=>i.code).join('\n')
    }
    if(other_exports.length>0){
        code+=`\n${other_exports.map(i=>i.code).join('\n')}`
    }
    return {code, registry}
}

export const declareInterface = (libraries: string[], variants: string[])=>{
    console.log({libraries, variants})
    const vr = variants.slice().map(v=>v.split('.'));
    let obj = {} as any;
    for(const variant of vr){
        objectFromArrayKeys(obj, variant, {[`[k: string]`]: `string | any`})
    }
    const transformed =  toJSONString(obj, 0, {
        fn(key) {
            return key.includes('k: string') || key.includes('string | any')
        },
        transformer(value) {
            return String.raw({raw: value})
        }
    })
    const str =  `\
type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});\n\
type K = ${Object.keys(obj).length>0 ? transformed:"Record<string, string | P | {[k: string]: P | string}>"};\n\
declare global {\n\
interface Window {\n\
    FLUIXI_ICONS?: Record<${libraries.slice().filter(l=>!l.endsWith('.ts')).map((n) => `"${n}"`).join(" | ")}, ${Object.keys(obj).length>0 ? `K`: `K | Record<string, K>`}>;\n\
}\n\
}\n\
export {}\n\
`
    return str
}
export const createRegistyWindowMap = (_registry: string[], varName: string, libraries: string[], variants: string[])=>{
   const registry = deduplicateByValue(_registry)
    // console.log('registry map', registry)
    const first = `window.FLUIXI_ICONS`
    const str1 = `${first} = ${first} || ({} as any);\n`
    let prefixMap = `${first}`
    let index = 0;
    let s = ''
    let accumulator = `${prefixMap}`
    const types_name: string[] = []
    while(index<registry.length){
        types_name.push(registry[index])
        if(registry[index] !== '__default__'){
            accumulator += `["${registry[index]}"]`
        }
        if(index===registry.length-1 || registry[index] === '__default__'){
            s+= `${accumulator} = ${varName};\n`
        }else{
            s += `${accumulator} = ${accumulator} || ({} as any);\n`
        }
        index+=1
    }
    const regisry_copy = registry.slice();
    regisry_copy.shift()
    let type_obj = {}
    objectFromArrayKeys(type_obj, regisry_copy, {[`[k: string]`]: `keyof typeof ${varName}`})
    // console.log({type_obj, re})

    let str = `\
if(typeof window !== 'undefined'){\n\
    if(${first}){
        ${str1}\
        ${s}\
    }
}\
    `.trim()
    return str
}
// export const exportToString = (export_values: ExportResult[])=>{
    // let code: string = '';
    // const map_exports = export_values.slice().filter(i=>i.type === 'map').map(i=>(i.code)).join(',\n')
    // const variables_exports = export_values.slice().filter(i=>i.type==='variable')
    // const normal_exports = export_values.slice().filter(i=>i.type !== 'map' && i.type!=='variable')
    // if(normal_exports_data.length>0){
    //     code = normal_exports_data.map(i=>i.code).join('\n')
    // } 
    // return {code, map_exports, variables_exports}
// }