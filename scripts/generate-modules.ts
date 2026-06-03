import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import {formatCode} from "./format-code";
import { AstExportOption, CodeResult, createRegistyWindowMap, declareInterface, exportOption, ExportResult, exportToString, groupExports, groupImports, importOption, ImportResult, importToString, transformAstNodes, type AstCode as _AstCode } from "./ast";
import type { GeneratorParams, IconNode, PkgExport } from "./types";
import { addOptions, capitalize, construcPkgExport, deduplicateByValue, ensureDir, getIconShorthand, getParentDir, getValueDeep, objectFromArrayKeys, pick, removeUrlParts, safePath, sanitizeName, toJSONString, toPascalCase, updateBuildConfigJson, updatePackageJson } from "./utils";
import { generateIconComponent } from "./generate-component";
import LICENSES, { LICENCES_VARIANTS } from "./license/licenses";
import { getLicense, insertLicense } from "./license/utils";
import { optimizeSVG } from "./optimize";
import { compile, compileTsToJs, generateTypes, getPathMatcher } from "./generate-types";
import { cwd } from "process";

interface AstCode extends _AstCode, GeneratorParams {}

interface RegistyResult{
    unique_registries: {
        registry: string[];
        selector: string;
    }[];
    file: string;
    variants: string[]
    exported: CodeResult[],
    imported: CodeResult[]
    context_imports: {file: string, data: ImportResult[]}[],
    context_exports: {file: string, data: ExportResult[]}[]
}


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.resolve(__dirname, "../packages/icons");
const INDEX_FILE = 'index'
const IMPORT_FILE = 'imports-maps'
const ALL_FILES = 'all'

// const TEMPLATES_BASE_PATH = path.resolve(__dirname, "../../libs/fluixi-webcomponents/packages/components/flx-icon")
// const TEMPLATES_SRC_PATH = path.join(TEMPLATES_BASE_PATH, 'src')
// const REACT_SRC_PATH = path.resolve(
//   __dirname,
//   "../../libs/fluixi-webcomponents/packages/components/react",
// );


const getVarName = (pkgName: string, baseName: string, camel = false)=>{
    let varName: string;
    let vars: string[] = []
    // if(pkgName === 'icon-internal'){
    //     vars = [baseName!=="icons" ? baseName : null].filter(a=>a!==null)
    // }else{
    // }
    vars = [getIconShorthand(pkgName!).toLowerCase(), baseName!=="icons" ? baseName : null].filter(a=>a!==null)
    // if(camel){
    //     varName = `${vars.join('-')}`
    // }else{
    // }
    varName = `${toPascalCase(vars.join('-'))}`
    return {varName, kebab: `${vars.join('-')}`}
}
async function buildTree(dir: string, parents: IconNode[], options: GeneratorParams, depth = 0): Promise<{data: IconNode, variants: ([string, string[]] | string)[]}> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const {setName, pkgName} = options
    const nodes: IconNode[] = [];
    const variants: ([string, string[]] | string)[] = []
    for (const e of entries) {
        const full = path.join(dir, e.name);
        const baseName = sanitizeName(e.name.replace(/-svgrepo-com/, '').replace(/\.svg$/, "").replace(/_/g, '-').toLowerCase())
        const pascalName = toPascalCase(baseName);
        const {varName, kebab} = getVarName(pkgName!, baseName, !e.isDirectory())
        const extra = {
            ...options,
            setName,
            pkgName,
            baseName,
            pascalName,
            kebabName: kebab,
            varName,
            name: sanitizeName(path.basename(dir)).toLowerCase(),
            path: dir,
            isDir: true,
            parentDir: dir.split(path.sep).slice(0, -1).join(path.sep),
        }
        if (e.isDirectory()) {
            const name = safePath(e.name.toLowerCase());
            // variants.push(name)
            let p: any = {path: path.join(dir, sanitizeName(e.name).toLowerCase()), isDir: true, name};
            if(LICENCES_VARIANTS.some(l=>l===name)){
                p = {
                    ...extra,
                    ...p, 
                    safe_path: safePath(full),
                    parentDir: dir,
                    parents
                }
            }
            const {data, variants: childrenVariants} = (await buildTree(full, [...parents, p], options, depth + 1))
            // console.log('cc', {name, childrenVariants, variants, setName})
            if(childrenVariants.length===0){
                variants.push([name, []])
            }else{
                if(depth>0){
                    variants.push(Array.from(new Set([name, ...childrenVariants])) as any)
                }else{
                    // const n = [...variants].slice()
                    if(variants.length===0){
                        // console.log('adding', childrenVariants)
                        // console.log('adding to', n.slice())
                        const v = Array.from(new Set([...childrenVariants]))
                        variants.push(...[...deduplicateByValue(v) as any] as any)
                    }
                }
            }
            // if(name!==)
            nodes.push({
            ...p,
            parents,
            children: data.children,
            variants
            });
        } else if (e.name.endsWith(".svg")) {
            nodes.push({ ...extra, name: sanitizeName(e.name.replace(/-svgrepo-com/, '').replace(".svg", "")).toLowerCase(), path: full, safe_path: safePath(full).replace(/-svgrepo-com/, ''), isDir: false, parents });
        }
    }
    const baseName = sanitizeName(path.basename(dir).replace(/-svgrepo-com/, '').replace(/\.svg$/, "").replace(/_/g, '-'))
    const pascalName = toPascalCase(baseName);
    const {varName, kebab} = getVarName(pkgName!, baseName)
    const extra = {
        ...options,
        baseName,
        kebabName: kebab,
        pascalName,
        varName,
    }
    const data = {...extra, name: safePath(path.basename(dir).replace(/-svgrepo-com/, '')), path: dir, safe_path: safePath(dir),  isDir: true, children: nodes } as IconNode;
    return {data, variants}
}

interface ComponentTemplate{
    template: string;
    file_path: string;
    filename: string;
    definitionFileName: string;
    definition: string;
    index: string
    component_name: string
    component_tag_name: string;
    react_component: string
    name: string;
    web_component_type: string
    react_component_type: string
}

function appendToFile(file_path: string, content: string){
    ensureDir(path.dirname(file_path));
    if(!fs.existsSync(file_path)){
        fs.writeFileSync(file_path, content)
    }else{
        fs.appendFileSync(file_path, content)
    }
}

async function _writeTree(node: IconNode, parent: IconNode | null, outDir: string, depth = 0, _ast_data: AstCode[] = [], options: {map: any, files_map: any, pkgs: PkgExport[], templates: TreeTemplate} = {map: {}, files_map: {}, pkgs: [], templates: {files: []} as any}) {
    let {map, files_map, templates} = options;
    // const has_child = (node.children || []).some(c=>c.isDir)
    const exportOptions: AstExportOption[] = [];
    const importOptions: AstExportOption[] = [];
    const ast_data: AstCode[] = [];
    // console.log('var', node.varName)
    // const first_promise: Promise<AstCode[]>[] = [];
    const children = node.children || []
    for(let i=0; i<children.length; i++){
        const child = children[i]
        const {varName, baseName, licenseInfo, setName} = child
        const nodeExportedIconsVarName = `${node.varName}Icons`
        const nodeVartTypeName = `${node.varName}Name`
        const iconVarTypeName = `${varName}Name`
        const iconsVarName = `${varName}Icons`
        // const parts = removeUrlParts(node.path, -1)
        // const parentIsOut = path.join(parts, 'src', 'icons')===`${node.outIconsDir}`
        // if(parentIsOut){
        //     console.log('is icon path', {node: node.path, parts, child: path.dirname(child.path), out: child.outIconsDir})
        // }
        // if(parent_dir===node.outIconsDir){
        //     console.log('case catched', {varName, baseName, licenseInfo, pascalName, setName, partents: child.parents?.map(p=>p.name).filter(p=>p!=="icons"), parent_dir})
        // }
        // const index_file = 'index'
        // const import_map_file = 'imports-maps'
        const parents = child.parents?.slice().map(p=>p.name).filter(p=>p!=="icons");
        if (child.isDir) {
            ensureDir(outDir);
            const parent_dir = getParentDir(outDir)
            // console.time(`generate icons dir for ${child.name} and parent dir ${node.name} and path ${child.path} and ${child.setName}`)
            const registry_parent = [...(parents ?? [])]
            if(registry_parent.length>0){
                registry_parent.pop()
                if(registry_parent.length===0){
                    registry_parent.push('__default__')
                }
            }
            // if(!LICENCES_VARIANTS.some(l=>l===child.name)) return ast_data
            if(!LICENCES_VARIANTS.some(l=>l===child.name)) continue
            const subOut = path.join(outDir, child.baseName!);
            const parent_nme = path.basename(parent_dir)
            const full_set = toPascalCase([getIconShorthand(child.setName!), ...parents!, child.baseName].filter(a=>a!=="__default__").join('-'))
            // const normal_set = toPascalCase([getIconShorthand(child.setName!), ...parents!].filter(a=>a!=="__default__").join('-'))
            // const childs_get = getChildsVariants(child)
            const childs = (child as any).variants
            // console.log('childs variants', childs, childs_get)
            // console.log('childs variants get', childs_get)
            const vPaths = variantsToPath(childs as any)
            // console.log('variants are', {vPaths, childs, full_set, normal_set, parent_dir, subOut, n: child.path})

            // if(nodeVartTypeName==="HeroIconsName"){
            //     console.log('full_set', {full_set, normal_set, parent_dir, parents, path: child.path, childs, vPaths, basename: child.baseName})

            // }
            // if(parents!.length>0){
            //     const copy = parents!.slice()
            //     copy.shift();
            //     console.log('parents', full_set)
            // }
            // if((parent_nme ===  "icons" || parent_nme=== "src")){
            //     console.log('case catched', {varName, baseName, licenseInfo, pascalName, setName, partents: child.parents?.map(p=>p.name).filter(p=>p!=="icons"), parent_dir, outDir})
            // }
            addOptions([
                /**
                 * Will add a map like
                 * - const lib = { solid: {....ValuesRecord} }
                 */
                exportOption(String.raw({raw: iconsVarName}), 'map', {file: INDEX_FILE, path: outDir, from: `./${baseName}/index.js`, key: `"${baseName}"`, selector: nodeExportedIconsVarName})!,
                // Will add type like const type TypeSelector = item1 | item2 | item3
                exportOption(`keyof typeof ${String.raw({raw: nodeExportedIconsVarName})}`, 'types', {file: INDEX_FILE, path: outDir, selector: nodeVartTypeName, default: true}),
                exportOption(parents!.length == 0 ?iconVarTypeName : `${iconVarTypeName} as ${full_set}Name`, 'types', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
                // exportOption(String.raw({raw: iconVarTypeName}), 'types', {file: INDEX_FILE, path: outDir, selector: `${node.varName}IconName`, default: true}),
                // exportOption(`() => import("./${baseName}/index.js")`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: `${node.varName}IconsMap`})!,
                // exportOption(`${child.varName}IconsMap`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName})!,
                // exportOption(nodeExportedIconsMapVarName, 'const', {file: import_map_file, path: outDir, selector: `${node.varName}IconsMap`, default: true, registry: [...(parents ?? [])]})!,
                exportOption(nodeExportedIconsVarName, 'const', {file: INDEX_FILE, path: outDir, selector: nodeExportedIconsVarName, default: true, registry: [...(parents ?? [])]})!,
                /**
                 * - Her we setup the imports-map exportation Record on the first
                 * - An on the second we mark the variables containing the imports maps as default
                 */
                // exportOption(nodeExportedIconsMapVarName, 'map', {file: import_map_file, path: parent_dir, key: `"${node.baseName}"`, selector: `${toPascalCase(path.basename(parent_dir))}IconsMap`})!,
                // exportOption(`${toPascalCase(path.basename(parent_dir))}IconsMap`, 'const', {file: import_map_file, path: parent_dir, selector: `${toPascalCase(path.basename(parent_dir))}IconsMap`, default: true, registry: registry_parent})!,
                /**
                 * - Her we setup the index file exportation Record off icons elements
                 * - An on the second we mark this variable as default
                 */
                ((parent_nme ===  "icons" || parent_nme=== "src") ? null : exportOption(nodeExportedIconsVarName, 'map', {file: INDEX_FILE, path: parent_dir, key: `"${node.baseName}"`, selector: `${toPascalCase(path.basename(parent_dir))}Icons`})!),
                ((parent_nme ===  "icons" || parent_nme==="src")? null : exportOption(`${toPascalCase(path.basename(parent_dir))}Icons`, 'const', {file: INDEX_FILE, path: parent_dir, selector: `${toPascalCase(path.basename(parent_dir))}Icons`, default: true, registry: registry_parent})!),
            ].filter(v=>v!==null), exportOptions)

            // if(vPaths.length===0){
            //     console.log('vPath empty ===>')
            // }
            for(const p of vPaths){
                const _variants = p.split('.')
                const vr_copy = _variants.slice();
                vr_copy.shift();
                const paths = [getIconShorthand(child.setName!), ..._variants]
                const varN = `${toPascalCase(paths.join('-'))}Name`
                const varNAs = `${full_set}${capitalize(toPascalCase(vr_copy.join(path.sep)))}Name`
                // if(varNAs==="Hero20SolidName"){
                //     console.log('varinatns', {normal_set, full_set, _variants, varNAs, parents})
                //     console.log('var name', varN, `./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js`)

                // }
                // const export_data = `export type { ${varNAs} } from "./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js";`
                // const imports: {file: string, value: string}[] = []
                // const parent_out = path.join(parent_dir, INDEX_FILE) 
                // const child_out = path.join(outDir, INDEX_FILE)
                // imports.push({file: path.join(outDir, INDEX_FILE), value: `import {default as ${iconsVarName}} from "./${baseName}/index.js"`})
                // imports.push({file: path.join(parent_dir, INDEX_FILE), value: `import {default as ${nodeExportedIconsVarName}} from "./${node.baseName}/index.js"`})
                // // console.log('export data', {parent_out, child_out, imports})
                
                const option = exportOption(`${varN} as ${varNAs}`, 'types', {from: `./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js`, file: INDEX_FILE, path: parent_dir})
                if(option){
                    exportOptions.push(option)

                }
            }
            
            
            // exportOptions.push(..._exports)
            // const _imports = []
            addOptions([
                //will add import `import { ${varName}Icons } from "./${baseName}/index.js";`
                importOption(iconsVarName, 'default', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
                //will add import `import type { ${varName}IconName } from "./${baseName}/index.js";`
                // importOption(iconVarTypeName, 'types', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
                // importOption(`${varName}IconsMap`, 'default', {from: `./${baseName}/imports-maps.js`, file: import_map_file, path: outDir})!,
                
                // importOption(nodeExportedIconsMapVarName, 'default', {from: `./${node.baseName}/imports-maps.js`, file: import_map_file, path: `${parent_dir}`})!,
                importOption(nodeExportedIconsVarName, 'default', {from: `./${node.baseName}/index.js`, file: INDEX_FILE, path: `${parent_dir}`})!,
            ].filter(v=>v!==null), importOptions)


            ast_data.push({
                importOptions,
                exportOptions,
            } as AstCode)
            
            const tree = await _writeTree(child, node, subOut, depth + 1, [], options);
            // console.timeEnd(`generate icons dir for ${child.name} and parent dir ${node.name} and path ${child.path} and ${child.setName}`)
            // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
            // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
            
            // exportOptions.push(...tree.exportOptions)
            // importOptions.push(...tree.importOptions)
            ast_data.push(...tree)
        } else {
            const svg = fs.readFileSync(child.path, "utf8");
            const optimized = optimizeSVG(svg, setName!);
            const withLicense = insertLicense(optimized, child.licenseInfo!);
            const fileOut = path.join(outDir, `${child.baseName}.ts`);
            const tsCode = `\
/**
 * Auto-generated by generate-icon-modules.ts
 * Icon: ${varName}
 * License: ${licenseInfo}
 */
const ${varName} = \`${withLicense}\`;
export default ${varName};
export { ${varName} };
export type IconName = '${baseName}';\n\
            `;
            // const formatted_code = await formatCode(tsCode, {parser: 'typescript'})
            const formatted_code = tsCode
            const map_value = {[`${baseName}`]: withLicense}
            // const import_map_value = {[`${baseName}`]: `import("./${path.join("icons", ...parents!, baseName!)}.js")`}
            objectFromArrayKeys(map, parents!, map_value)
            // objectFromArrayKeys(files_map, parents!, import_map_value)
            // console.log('parents', parents, map, map_value, files_map)
            const _imports = [
                // will add `import ${varName} from "./${baseName}.js";`
                importOption(`${varName}`, 'default', {from: `./${baseName}.js`, file: INDEX_FILE, path: outDir})!,
                // (!parent ? null : importOption(`${varName}IconsMap`, 'types', {from: `./${baseName}/imports-maps.js`, file: import_map_file, path: parent?.outIconsDir!})!),
            ].filter(v=>v!==null);
            addOptions(_imports, importOptions);
            // importOptions.push(..._imports)
            // console.log('outdir', outDir)
            const _exports = [
                // will exoprt like const VariableName = { `${varName}` }
                exportOption(`${varName}`, 'map', {file: INDEX_FILE, path: outDir, from: `./${baseName}.js`, selector: nodeExportedIconsVarName, key: `"${(baseName)}"`})!,
                exportOption(nodeExportedIconsVarName, 'const', {file: INDEX_FILE, path: outDir, selector: nodeExportedIconsVarName, default: true, registry: [...(parents ?? [])]})!,
                //will add type declaration like const type `${node.varName}IconName` =  item1 | item2 | item3
                exportOption(node.isDir ? `keyof typeof ${String.raw({raw: nodeExportedIconsVarName})}` : String.raw({raw: varName!}), 'types', {file: INDEX_FILE, path: outDir, selector: nodeVartTypeName, default: true})!,
                // exportOption(`"${baseName}"`, 'types', {file: INDEX_FILE, path: outDir, selector: `${node.varName}IconName`, default: true})!,
                // exportOption(`\`${withLicense}\``, 'map', {file: IMPORT_FILE, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName, parents: parents} as any),
               // exportOption(`() => import("./${baseName}.js")`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName}),
                // exportOption(nodeExportedIconsMapVarName, 'const', {file: import_map_file, path: outDir, selector: nodeExportedIconsMapVarName, default: true, registry: [...(parents ?? [])]}),
                //// exportOption(String.raw({raw: `${varName}IconsMap`}), 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: `${node.varName}IconsMap`})!
            ].filter(e=>e!==null)

            ast_data.push({
                lib: '__file__',
                setName,
                importOptions: importOptions,
                exportOptions: exportOptions
            } as AstCode)
            // exportOptions.push(..._exports)
            addOptions(_exports, exportOptions)
        
            writeFiles(fileOut, formatted_code)
            // console.log('types', dts_path)
            const template = await generateIconComponent(setName!, baseName!, parents!, withLicense)
            writeTemplate(template, setName!, templates as any)
            templates.files.push(template.file_path)
            // templates.push(template)
            // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
            // ast_data.push({
            //     key: varName!,
            //     varName: varName!,
            //     value: `${varName}`,
            //     from: `./${baseName}.js`,
            //     path: fileOut,
            //     name: baseName!,
            //     importOptions: importOptions,
            //     exportOptions: exportOptions,
            //     ...(pick(child, ['licenseInfo', 'pascalName', 'baseName', 'varName', 'outIconsDir', 'setName']) as any)
            // })
        }
        // return ast_data
    }
    // const first_promise = (node.children || []).map(async(child)=>{
    //     const {varName, baseName, licenseInfo, pascalName, setName, kebabName} = child
    //     const parent_dir = getParentDir(outDir)
    //     const nodeExportedIconsVarName = `${node.varName}Icons`
    //     const nodeVartTypeName = `${node.varName}Name`
    //     const nodeExportedIconsMapVarName = `${node.varName}IconsMap`
    //     const iconVarTypeName = `${varName}Name`
    //     const iconsVarName = `${varName}Icons`
    //     const parts = removeUrlParts(node.path, -1)
    //     const parentIsOut = path.join(parts, 'src', 'icons')===`${node.outIconsDir}`
    //     // if(parentIsOut){
    //     //     console.log('is icon path', {node: node.path, parts, child: path.dirname(child.path), out: child.outIconsDir})
    //     // }
    //     // if(parent_dir===node.outIconsDir){
    //     //     console.log('case catched', {varName, baseName, licenseInfo, pascalName, setName, partents: child.parents?.map(p=>p.name).filter(p=>p!=="icons"), parent_dir})
    //     // }
    //     // const index_file = 'index'
    //     // const import_map_file = 'imports-maps'
    //     const parents = child.parents?.slice().map(p=>p.name).filter(p=>p!=="icons");
    //     if (child.isDir) {
    //         // console.time(`generate icons dir for ${child.name} and parent dir ${node.name} and path ${child.path} and ${child.setName}`)
    //         const registry_parent = [...(parents ?? [])]
    //         if(registry_parent.length>0){
    //             registry_parent.pop()
    //             if(registry_parent.length===0){
    //                 registry_parent.push('__default__')
    //             }
    //         }
    //         if(!LICENCES_VARIANTS.some(l=>l===child.name)) return ast_data
    //         const subOut = path.join(outDir, child.baseName!);
    //         const parent_nme = path.basename(parent_dir)
    //         const full_set = toPascalCase([getIconShorthand(child.setName!), ...parents!, child.baseName].filter(a=>a!=="__default__").join('-'))
    //         const normal_set = toPascalCase([getIconShorthand(child.setName!), ...parents!].filter(a=>a!=="__default__").join('-'))
    //         const childs = getChildsVariants(child)
    //         const vPaths = variantsToPath(childs as any)
    //         // console.log('variants are', {vPaths, childs, full_set, normal_set, parent_dir, subOut, n: child.path})

    //         // if(nodeVartTypeName==="HeroIconsName"){
    //         //     console.log('full_set', {full_set, normal_set, parent_dir, parents, path: child.path, childs, vPaths, basename: child.baseName})

    //         // }
    //         // if(parents!.length>0){
    //         //     const copy = parents!.slice()
    //         //     copy.shift();
    //         //     console.log('parents', full_set)
    //         // }
    //         // if((parent_nme ===  "icons" || parent_nme=== "src")){
    //         //     console.log('case catched', {varName, baseName, licenseInfo, pascalName, setName, partents: child.parents?.map(p=>p.name).filter(p=>p!=="icons"), parent_dir, outDir})
    //         // }
    //         addOptions([
    //             /**
    //              * Will add a map like
    //              * - const lib = { solid: {....ValuesRecord} }
    //              */
    //             exportOption(String.raw({raw: iconsVarName}), 'map', {file: INDEX_FILE, path: outDir, from: `./${baseName}/index.js`, key: `"${baseName}"`, selector: nodeExportedIconsVarName})!,
    //             // Will add type like const type TypeSelector = item1 | item2 | item3
    //             exportOption(`keyof typeof ${String.raw({raw: nodeExportedIconsVarName})}`, 'types', {file: INDEX_FILE, path: outDir, selector: nodeVartTypeName, default: true}),
    //             exportOption(parents!.length == 0 ?iconVarTypeName : `${iconVarTypeName} as ${full_set}Name`, 'types', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
    //             // exportOption(String.raw({raw: iconVarTypeName}), 'types', {file: INDEX_FILE, path: outDir, selector: `${node.varName}IconName`, default: true}),
    //             // exportOption(`() => import("./${baseName}/index.js")`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: `${node.varName}IconsMap`})!,
    //             // exportOption(`${child.varName}IconsMap`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName})!,
    //             // exportOption(nodeExportedIconsMapVarName, 'const', {file: import_map_file, path: outDir, selector: `${node.varName}IconsMap`, default: true, registry: [...(parents ?? [])]})!,
    //             exportOption(nodeExportedIconsVarName, 'const', {file: INDEX_FILE, path: outDir, selector: nodeExportedIconsVarName, default: true, registry: [...(parents ?? [])]})!,
    //             /**
    //              * - Her we setup the imports-map exportation Record on the first
    //              * - An on the second we mark the variables containing the imports maps as default
    //              */
    //             // exportOption(nodeExportedIconsMapVarName, 'map', {file: import_map_file, path: parent_dir, key: `"${node.baseName}"`, selector: `${toPascalCase(path.basename(parent_dir))}IconsMap`})!,
    //             // exportOption(`${toPascalCase(path.basename(parent_dir))}IconsMap`, 'const', {file: import_map_file, path: parent_dir, selector: `${toPascalCase(path.basename(parent_dir))}IconsMap`, default: true, registry: registry_parent})!,
    //             /**
    //              * - Her we setup the index file exportation Record off icons elements
    //              * - An on the second we mark this variable as default
    //              */
    //             ((parent_nme ===  "icons" || parent_nme=== "src") ? null : exportOption(nodeExportedIconsVarName, 'map', {file: INDEX_FILE, path: parent_dir, key: `"${node.baseName}"`, selector: `${toPascalCase(path.basename(parent_dir))}Icons`})!),
    //             ((parent_nme ===  "icons" || parent_nme==="src")? null : exportOption(`${toPascalCase(path.basename(parent_dir))}Icons`, 'const', {file: INDEX_FILE, path: parent_dir, selector: `${toPascalCase(path.basename(parent_dir))}Icons`, default: true, registry: registry_parent})!),
    //         ].filter(v=>v!==null), exportOptions)

    //         // if(vPaths.length===0){
    //         //     console.log('vPath empty ===>')
    //         // }
    //         for(const p of vPaths){
    //             const _variants = p.split('.')
    //             const vr_copy = _variants.slice();
    //             vr_copy.shift();
    //             const paths = [getIconShorthand(child.setName!), ..._variants]
    //             const varN = `${toPascalCase(paths.join('-'))}Name`
    //             const varNAs = `${full_set}${capitalize(toPascalCase(vr_copy.join(path.sep)))}Name`
    //             // if(varNAs==="Hero20SolidName"){
    //             //     console.log('varinatns', {normal_set, full_set, _variants, varNAs, parents})
    //             //     console.log('var name', varN, `./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js`)

    //             // }
    //             // const export_data = `export type { ${varNAs} } from "./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js";`
    //             // const imports: {file: string, value: string}[] = []
    //             // const parent_out = path.join(parent_dir, INDEX_FILE) 
    //             // const child_out = path.join(outDir, INDEX_FILE)
    //             // imports.push({file: path.join(outDir, INDEX_FILE), value: `import {default as ${iconsVarName}} from "./${baseName}/index.js"`})
    //             // imports.push({file: path.join(parent_dir, INDEX_FILE), value: `import {default as ${nodeExportedIconsVarName}} from "./${node.baseName}/index.js"`})
    //             // // console.log('export data', {parent_out, child_out, imports})
                
    //             const option = exportOption(`${varN} as ${varNAs}`, 'types', {from: `./${path.join(path.basename(path.dirname(child.path)), ..._variants)}/index.js`, file: INDEX_FILE, path: parent_dir})
    //             if(option){
    //                 exportOptions.push(option)

    //             }
    //         }
            
            
    //         // exportOptions.push(..._exports)
    //         // const _imports = []
    //         addOptions([
    //             //will add import `import { ${varName}Icons } from "./${baseName}/index.js";`
    //             importOption(iconsVarName, 'default', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
    //             //will add import `import type { ${varName}IconName } from "./${baseName}/index.js";`
    //             // importOption(iconVarTypeName, 'types', {from: `./${baseName}/index.js`, file: INDEX_FILE, path: outDir})!,
    //             // importOption(`${varName}IconsMap`, 'default', {from: `./${baseName}/imports-maps.js`, file: import_map_file, path: outDir})!,
                
    //             // importOption(nodeExportedIconsMapVarName, 'default', {from: `./${node.baseName}/imports-maps.js`, file: import_map_file, path: `${parent_dir}`})!,
    //             importOption(nodeExportedIconsVarName, 'default', {from: `./${node.baseName}/index.js`, file: INDEX_FILE, path: `${parent_dir}`})!,
    //         ].filter(v=>v!==null), importOptions)


    //         ast_data.push({
    //             importOptions,
    //             exportOptions,
    //         } as AstCode)

    //         const tree = await writeTree(child, node, subOut, depth + 1, [], options);
    //         // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
    //         // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
            
    //         // exportOptions.push(...tree.exportOptions)
    //         // importOptions.push(...tree.importOptions)
    //         ast_data.push(...tree)
    //         // console.timeEnd(`generate icons dir for ${child.name} and parent dir ${node.name} and path ${child.path} and ${child.setName}`)
    //     } else {
    //         const svg = fs.readFileSync(child.path, "utf8");
    //         const optimized = optimizeSVG(svg, setName!);
    //         const withLicense = insertLicense(optimized, child.licenseInfo!);
    //         const fileOut = path.join(outDir, `${child.baseName}.ts`);
    //         const tsCode = `\
    //             /**
    //              * Auto-generated by generate-icon-modules.ts
    //              * Icon: ${varName}
    //              * License: ${licenseInfo}
    //              */
    //             const ${varName} = \`${withLicense}\`;
    //             export default ${varName};
    //             export { ${varName} };
    //             export type IconName = '${baseName}';\n\
    //         `;
    //         const formatted_code = await formatCode(tsCode, {parser: 'typescript'})
    //         const map_value = {[`${baseName}`]: withLicense}
    //         const import_map_value = {[`${baseName}`]: `import("./${path.join("icons", ...parents!, baseName!)}.js")`}
    //         objectFromArrayKeys(map, parents!, map_value)
    //         objectFromArrayKeys(files_map, parents!, import_map_value)
    //         // console.log('parents', parents, map, map_value, files_map)
    //         const _imports = [
    //             // will add `import ${varName} from "./${baseName}.js";`
    //             importOption(`${varName}`, 'default', {from: `./${baseName}.js`, file: INDEX_FILE, path: outDir})!,
    //             // (!parent ? null : importOption(`${varName}IconsMap`, 'types', {from: `./${baseName}/imports-maps.js`, file: import_map_file, path: parent?.outIconsDir!})!),
    //         ].filter(v=>v!==null);
    //         addOptions(_imports, importOptions);
    //         // importOptions.push(..._imports)
    //         // console.log('outdir', outDir)
    //         const _exports = [
    //             // will exoprt like const VariableName = { `${varName}` }
    //             exportOption(`${varName}`, 'map', {file: INDEX_FILE, path: outDir, from: `./${baseName}.js`, selector: nodeExportedIconsVarName, key: `"${(baseName)}"`})!,
    //             exportOption(nodeExportedIconsVarName, 'const', {file: INDEX_FILE, path: outDir, selector: nodeExportedIconsVarName, default: true, registry: [...(parents ?? [])]})!,
    //             //will add type declaration like const type `${node.varName}IconName` =  item1 | item2 | item3
    //             exportOption(node.isDir ? `keyof typeof ${String.raw({raw: nodeExportedIconsVarName})}` : String.raw({raw: varName!}), 'types', {file: INDEX_FILE, path: outDir, selector: nodeVartTypeName, default: true})!,
    //             // exportOption(`"${baseName}"`, 'types', {file: INDEX_FILE, path: outDir, selector: `${node.varName}IconName`, default: true})!,
    //             // exportOption(`\`${withLicense}\``, 'map', {file: IMPORT_FILE, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName, parents: parents} as any),
    //            // exportOption(`() => import("./${baseName}.js")`, 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: nodeExportedIconsMapVarName}),
    //             // exportOption(nodeExportedIconsMapVarName, 'const', {file: import_map_file, path: outDir, selector: nodeExportedIconsMapVarName, default: true, registry: [...(parents ?? [])]}),
    //             //// exportOption(String.raw({raw: `${varName}IconsMap`}), 'map', {file: import_map_file, path: outDir, key: `"${baseName}"`, selector: `${node.varName}IconsMap`})!
    //         ].filter(e=>e!==null)

    //         ast_data.push({
    //             lib: '__file__',
    //             setName,
    //             importOptions: importOptions,
    //             exportOptions: exportOptions
    //         } as AstCode)
    //         // exportOptions.push(..._exports)
    //         addOptions(_exports, exportOptions)
        
    //         writeFiles(fileOut, formatted_code)
    //         // console.log('types', dts_path)
    //         const template = await generateIconComponent(setName!, baseName!, parents!, withLicense)
    //         writeTemplate(template, setName!, templates as any)
    //         templates.files.push(template.file_path)
    //         // templates.push(template)
    //         // pkgs.push(construcPkgExport(child.parents ? path.join(...child.parents.slice().map(p=>p.baseName!), baseName!) : '', baseName!, {distDir: path.basename(child.destDir!), includes: ['types', 'default', "import", "require"], addSrc: true}))
    //         // ast_data.push({
    //         //     key: varName!,
    //         //     varName: varName!,
    //         //     value: `${varName}`,
    //         //     from: `./${baseName}.js`,
    //         //     path: fileOut,
    //         //     name: baseName!,
    //         //     importOptions: importOptions,
    //         //     exportOptions: exportOptions,
    //         //     ...(pick(child, ['licenseInfo', 'pascalName', 'baseName', 'varName', 'outIconsDir', 'setName']) as any)
    //         // })
    //     }
    //     return ast_data
    // })
    return ast_data
    // console.log('running promise')
    // console.time(`promise ${node.setName} done in`)
    // const promises = await Promise.all(first_promise)
    // console.timeEnd(`promise ${node.setName} done in`)
    // return promises
}
async function writeTree(node: IconNode, parent: IconNode | null, outDir: string, depth = 0, _ast_data: AstCode[] = [], options: {map: any, files_map: any, pkgs: PkgExport[], templates: TreeTemplate} = {map: {}, files_map: {}, pkgs: [], templates: {files: []} as any}) {
    const tree = await _writeTree(node, parent, outDir, depth, _ast_data, options)
    return deduplicateByValue(tree)
}

async function transformAst(ast_data: AstCode[], setName: string, libraries: string[], variants: string[]){
    // console.time(`write ast files for ${setName}`)
    const {export_values, import_values, exports_results, imports_results} = transformAstNodes(ast_data)
    const files = Array.from(new Set(import_values.slice().flatMap(v=>v.file).concat(export_values.slice().map(v=>v.file))))
    const values = files.map(async(file)=>{
        const _exports = exports_results.slice().filter(v=>path.join(v.path, v.file) === file);
        const _imports = imports_results.slice().filter(v=>path.join(v.path, v.file) === file);
        const context_exports = export_values.slice().filter(v=>v.file === file);
        const context_imports = import_values.slice().filter(v=>v.file === file);
        const exports_registries = context_exports.slice().flatMap(e=>e.data).flatMap(e=>({registry:e.registry ?? [], selector: e.selector!})).filter(e=>e.registry.length>0 && e.selector.length>0)
        const unique_registries = Array.from(new Set(exports_registries.map(e=>({registry: e.registry, selector: e.selector}))))
        return {unique_registries, file, variants, exported: _exports, imported: _imports, context_exports, context_imports}
    })
    const res = await Promise.all(values)
    // console.timeEnd(`write ast files for ${setName}`)
    return res;

}

async function generateGlobalRegistryIndex(node: IconNode, file: string, variants: string[]) {
    // console.log('combined', variants)
    const {srcDir } = node
    let types = variants.map(v=>`export type {${toPascalCase([getIconShorthand(node.setName!), ...v.split('.'), 'name'].join('-'))}} from "./${path.join('icons', 'index')}.js"`).join(';')
    if(variants.length===0){
        types = `export type {${toPascalCase([getIconShorthand(node.setName!), 'name'].join('-'))}} from "./${path.join('icons', 'index')}.js"`
    }
    const outFile = path.join(srcDir!, `${file}.ts`);
    const imports = `import Icons from "./icons/${file}.js"\n${types}\nexport default Icons;\nexport {Icons}\n`;
    const code = `${imports}\n\n// ✅ Imports all icon registries to register them globally.\n`;
    const formatted_code = code
    console.log('write global', outFile)
    writeFiles(outFile, formatted_code)
}
async function generateGlobalRegistryImportMap(options: IconNode, map: any, variants: string[]) {
    // let data = {}
    const obj = toJSONString(map, 0, {
        fn(key) {
            return key.includes('import(')
        },
        transformer(value) {
            const regex = /import\((['"`])([^'"`]+)\1\)/g;
            const v = [...value.matchAll(regex)]
            if (v.length > 3) {
                console.log('v', v)
                return String.raw({raw: `import('${v[2]}')`})
            }
            return value
        }
    })
    const {srcDir } = options
    const outFile = path.join(srcDir!, `${IMPORT_FILE}.ts`);
    const imports = `const IconsMap = ${obj}`;
    const exports = `export default IconsMap;\nexport {IconsMap}\n`
    const code = `${imports}\n${exports}\n// ✅ Imports all icon registries to register them globally.\n`;
    // const formatted_code = await formatCode(code, {parser: 'typescript'})
    const formatted_code = code
    // console.log('group map', file)
    writeFiles(outFile, formatted_code)
}
async function generateGlobalRegistryAll(options: IconNode) {
    const {srcDir } = options
    const outFile = path.join(srcDir!, `${ALL_FILES}.ts`);
    const imports = `import Icons from "./icons/${ALL_FILES}.js"`;
    const exports = `export default Icons;\nexport {Icons}\n`
    const code = `${imports}\n${exports}\n// ✅ Imports all icon registries to register them globally.\n`;
    // const formatted_code = await formatCode(code, {parser: 'typescript'})
    const formatted_code = code
    writeFiles(outFile, formatted_code)
}

async function generateGlobalRegistry(options: IconNode, file: string) {
    const {srcDir } = options
    const outFile = path.join(srcDir!,`${file}.ts`);
    const libs = Object.keys(LICENSES).map((k) => k.replace('icon-', ''));
    const imports = libs.map((lib) => `import "./${lib}/${file}.js";`).join("\n");
    const code = `${imports}\n\n// ✅ Imports all icon registries to register them globally.\n`;
    // const formatted_code = await formatCode(code, {parser: 'typescript'})
    const formatted_code = code
    writeFiles(outFile, formatted_code)
}

const getVartiants = (node: IconNode): string[]=>{
    if(node.children && node.children.length>0){
        const v = Array.from(new Set([ ...node.children.map((e)=>getVartiants(e)).flat()]))
        // if(v.length>2){
        //     v.shift()
        // }
        return v
        // return node.children.map((e)=>getVartiants(e)) as string[]
    }
    return [(node.parents ?? []).map(p=>p.name === "icons" ? null : p.name).filter(p=>p!==null).join('.')] as string[]
}
const getChildsVariants = (node: IconNode, depth=0)=>{
    const variants: ([string, string[]] | string)[] = []
    if(node.isDir){
        const child_variants: ([string, string[]] | string)[] = []
        // if(depth>0){
        //     child_variants.push([node.name])
        // }
        for(const child of node.children!){
            const vr = getChildsVariants(child, depth + 1)
            const v = vr[0]
            child_variants.push(...vr)
        }
        // console.log('c', child_variants)
        if(child_variants.length>0){
            if(depth>0){
                variants.push([node.name, ...child_variants] as any)
            }else{
    
                variants.push(...child_variants)
            }
        }else{
            variants.push([node.name!, []])
        }
        return variants
    }
    return []
}
const _variantsToPath = (variants: [string, string[]])=>{
    const results: string[] = []
    for(let i=0; i<variants.length; i++){
        const variant = variants[i];
        if(typeof variant == "string"){
            results.push(variant)
            continue;
        }
        if(variant.length === 0) continue;
        const first = variant[0];
        const values = variant[1];
        const vr = [first]
        if(values && values.length>0){
            // Previously used `length===2` heuristic which incorrectly treated a
            // two-element string array (e.g. ["outline","solid"]) as a nested
            // [name, children] pair, merging them into one path instead of two.
            // Fix: only recurse when elements are themselves arrays (nested structure).
            const isNested = Array.isArray(values) && values.some((v: any) => Array.isArray(v))
            if(isNested){
                vr.push(..._variantsToPath(values as any))
            }else{
                vr.push(values)
            }
        }
        results.push(...vr)
    }
    return results
}
const variantsToPath = (variants: [string, string[]][])=>{
    const results: string[] = []
    for(let i=0; i<variants.length; i++){
        const variant = variants[i];
        const vr = _variantsToPath(variant)
        results.push(vr.join('.'))
    }
    return results
}


const filterLibs = (libraries: string[], iconsDir: string)=>{
    const results: {lib: string, srcDir: string}[] = []
    for(const lib of libraries){
        if(LICENCES_VARIANTS.some(l=>l===sanitizeName(lib.toLowerCase()))){
            results.push({lib, srcDir: path.join(iconsDir, lib)})
        }else{
            let isLastOrvalidVariant = false
            let dirs: string[] = []
            let src = iconsDir
            const sync_files = fs.readdirSync(src, { withFileTypes: true })
            const directories = sync_files.slice().filter((d) => d.isDirectory())
            console.log('directories', directories)
            const files = sync_files.slice().filter((d) => !d.isDirectory() && d.name.endsWith('.svg'))
            for(const directory of directories){
                if(!LICENCES_VARIANTS.some(l=>l===sanitizeName(directory.name.toLowerCase()))){
                    results.push(...filterLibs([directory.name], path.join(src, directory.name)))
                }else{
                    results.push({lib: directory.name, srcDir: path.join(src, directory.name)})
                }
            }
            if(files.length>0){
                results.push({lib, srcDir: path.join(src, files[0].name)})
            }
            
        }
        
    }
    return results
}

interface Tree{[key: string]: (ValueType & {react: Omit<ValueType, "icons">}) | string[] }
interface TreeTemplate extends Tree{files: string[]}
async function generateAll(pkgDir: string) {
    console.log("🔍 Scanning:", pkgDir);
    const pkgName = path.basename(pkgDir);
    const iconsDir = path.join(pkgDir, "icons");
    const setName = pkgName.replace(/^icon-/, "");
    const srcDir = path.join(pkgDir, "src");
    const outIconsDir = path.join(srcDir, "icons");
    // const outIconsDir = srcDir;
    const distDir = path.join(pkgDir, "dist");

    if (!fs.existsSync(iconsDir)) return;

    fs.mkdirSync(outIconsDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    const libraries = fs
        .readdirSync(iconsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    // const filter_libraries = filterLibs(libraries, iconsDir)
    // console.log('l', filter_libraries)
    // Object that collect the tree icons
    let map: any = {}
    let files_import_map = {}
    // const templates: ComponentTemplate[] = []
    const templates:  TreeTemplate= {files: []} as any
    const pkgs: PkgExport[] = []
    const buildLib = async (lib: string) => {
        console.log(`\n📦 Generating library: ${lib}`);
        console.time(`\n✅ ${lib} generated in`);
        let src = iconsDir
        let out = outIconsDir
        // if(lib!=='__default__'){
        //     src = path.join(iconsDir, lib);
        //     out = path.join(outIconsDir, lib);
        // }
        const licenseInfo = getLicense(pkgName);
        const ast_nodes: AstCode[] = []
        // ensureDir(out);
        let name = path.basename(src)
        let baseName = sanitizeName(name).toLowerCase()
        let pascalName = toPascalCase(baseName);
        let varName = `${toPascalCase([getIconShorthand(pkgName!)].join('-'))}`
        let count = 0
        const {data: tree} = await buildTree(src, [
            {
                setName,
                pkgName,
                baseName,
                pascalName,
                varName,
                safe_path: safePath(src),
                name: baseName,
                path: src,
                isDir: true,
                parentDir: src.split(path.sep).slice(0, -1).join(path.sep), 
            }
        ], {setName, pkgName, srcDir, destDir: distDir, outIconsDir, licenseInfo});
        const tree_ast = await writeTree(tree, null, out, 0, ast_nodes, {map, files_map: files_import_map, pkgs, templates});
        console.log('tree rite done', {len: tree_ast.length, imports: tree_ast.slice().map(i=>i.importOptions).flat().length, exports: tree_ast.slice().map(i=>i.exportOptions).flat().length})
        const tv = Array.from(new Set(tree.children ? {...tree}.children!.flatMap((e)=>getVartiants(e)) : [])).map(e=>e.replace(/^icons./, ''))
        const ast_variants = tv.filter(e=>e!=='icons')
        const dedup = deduplicateByValue(tree_ast)
        console.timeEnd(`\n✅ ${lib} generated in`);
        return {ast: dedup, variants: ast_variants};
        // await generateLibraryRegistry(tree);
    }
    // const promises: Promise<AstCode[]>[] = []
    if(libraries.length===0){
        libraries.push('__default__')
    }


    // const promises: Promise<AstCode[]>[] = libraries.map(async(lib) => await buildLib(lib));
    // const tree_values = (await Promise.all(promises)).flat();
    var tree_values: {ast: AstCode[], folder: string, variants?: string[]}[] = []
    for(const lib of libraries){
        const v = await buildLib(lib);
        tree_values.push({
            ...v,
            folder: lib
        })
        // await transformAst(v, setName)
    }

    // await generateGlobalIndex({setName, srcDir} as any);
    // await generateGlobalImportMap({setName, srcDir} as any);
    console.log("\n🎉 All icon registries generated successfully!");
    return {setName, ast: tree_values, srcDir, outIconsDir, map, files_import_map, pkgs, distDir, templates}
    // await generateGlobalRegistry({setName, srcDir} as any);
}


const getMapPath = (file: string, outIconsDir: string, use_parent = true) => {
    const path_without_name = use_parent ? path.dirname(file) : file;
    const parentDir = use_parent ?  getParentDir(path_without_name) : path_without_name;
    const replaced = parentDir!==outIconsDir ? path_without_name.replace(`${outIconsDir}`, "").split(path.sep).filter(a=>a.length>0) : [];
    return {replaced, file, parentDir}
}


const writeFullImportMap = (file: string, outIconsDir: string, setName: string, registry_maps: {
    setname: string;
    options: AstExportOption[];
}[], _variants: string[], isModule = true) => {
    // console.log('registry map', registry_maps)
    // const path_without_name = path.dirname(file);
    // const parentDir = getParentDir(path_without_name);
    const path_without_name = file;
    const parentDir = file
    const replaced = parentDir!==outIconsDir ? path_without_name.replace(`${outIconsDir}`, "").split(path.sep).filter(a=>a.length>0) : [];
    let map = ''
    // const variants = Array.from(new Set(_variants.slice().map(v=>v.split('.')[0])))
    const transform = {
        fn(key: any) {
            return key.includes('<svg')
        },
        transformer(value: any) {
            return `\`${String.raw({raw: value})}\``
        }
    }
    // console.log('values', {replaced, parentDir, outIconsDir, path_without_name, file, isModule})
    if((file===outIconsDir && replaced.length===0) || !isModule){
        // console.log('registry_maps', )
        map += `${toJSONString(registry_maps, 0, transform)?.replace('{', '').replace(/}(?=[^}]*$)/, ',')}\n`
    }else{
        const copy = replaced.slice()
        if(replaced.length>0){
            const picked = replaced.slice()
            if(replaced.length>1 && parentDir!==outIconsDir){
                copy.shift()
                // picked.pop()
            }
            let deep;
            if(isModule){
                deep = getValueDeep(registry_maps, picked)
            }else{
                deep = registry_maps
            }
            
            map = `${toJSONString(deep, 0, transform)?.replace('{', '').replace(/}(?=[^}]*$)/, ',')}`
            // if(replaced.length>1){
            // }else{
            //     map = `${toJSONString({[replaced[0]]: deep}, 0, transform)?.replace('{', '').replace(/}(?=[^}]*$)/, ',')}`
            // }
        }

    }
    return {map, file, write_path: path.join(parentDir, `${ALL_FILES}.ts`)}
}
const writeParentImportMap = (file: string, outIconsDir: string, registry_maps: any,_variants: string[], _literalVariants: string[], isModule: boolean = true) => {
    // const filename = path.basename(file);
    // const path_without_name = path.dirname(file);
    const path_without_name = file;
    const parentDir = file
    // const parentDir = getParentDir(path_without_name);
    const replaced = parentDir!==outIconsDir ? path_without_name.replace(`${outIconsDir}`, "").split(path.sep).filter(a=>a.length>0) : [];
    let map = ''
    const variants = Array.from(new Set(_variants.slice().map(v=>v.split('.')[0])))
    const literalVariants = Array.from(new Set(_literalVariants.slice().map(v=>v.split('.')[0])))
    if(!isModule){
        // console.log('r', registry_maps)
        map = toJSONString(registry_maps, 0, {
            fn(key) {
                return key.includes('import(')
            },
            transformer(value) {
                const regex = /import\((['"`])([^'"`]+)\1\)/g;
                const v = [...value.matchAll(regex)]
                if (v.length > 3) {
                    console.log('v', v)
                    return String.raw({raw: `import('${v[2]}')`})
                }
                return value
            }
        })!.replace('{', '').replace(/}(?=[^}]*$)/, ',')
        
    }else{
        if(literalVariants.length>0){
            map = `
            ${literalVariants.map(variant => `  "${variant}": () => import('./${variant}.js'),`).join('\n')}
            `
        }else{
    
            if(parentDir===outIconsDir){
                map = `
                ${variants.map(variant => `  "${variant}": () => import('./${path.join(...replaced, variant, IMPORT_FILE)}.js'),`).join('\n')}
                `
            }else{
                const copy = replaced.slice()
                if(replaced.length>0){
                    if(replaced.length>1){
                        copy.shift()
                    }
                    const vr = _variants.map(v=>v.split('.')).filter(v=>v.length>0 && v.some(vv=>vv===replaced.join('.') || vv===replaced[0])).map(v=>v.join('.'))
                    let vr_datat = {}
                    for(const _vt of vr){
                        const variants_split = _vt.split('.')
                        const picked = getValueDeep(registry_maps, _vt.split('.'))
                        if(!picked){
                            console.log('no picked key for', _vt.split('.'))
                        }
                        const cop = variants_split.slice()
                        cop.shift()
                        for (const key of Object.keys(picked)) {
                            objectFromArrayKeys(vr_datat, [...cop], {[key]: `import('./${path.join(...cop, key)}.js')`})
                        }
                        const transform = {
                            fn(key: any) {
                                return key.includes('import(')
                            },
                            transformer(value: any) {
                                return String.raw({raw: value})
                            }
                        }
                        map = toJSONString(vr_datat, 0, transform)!.replace('{', '').replace(/}(?=[^}]*$)/, ',')
                        
                    }
                }
            }
        }

    }

    return {map, file, write_path: path.join(literalVariants.length===0 ? parentDir : path_without_name, `${IMPORT_FILE}.ts`)}
}
const getRelativeImportPath = (file: string, srcDir: string)=>{
    let path_relative = file.split(path.join(srcDir, '/')).pop()?.split(path.sep).slice(0,-1).join(path.sep)
    if(path_relative?.startsWith('/')){
        path_relative = path_relative?.slice(1)
    }
    return path_relative
}

// const writeFullReactIndex = (sets: string[])=>{
//     writeFiles(path.join(REACT_SRC_PATH, 'icons', `index.ts`), sets.map(s=>`export * from "./${path.join(s, 'index')}.js"`).join('\n'), true, {matcher: 'react/icons', value: 'react/lib/icons'})
// }

interface ValueType{data: any[], index: string[], icons: string[]}
interface ModuleConfig{
    generateTypes?: boolean
    matcher: {
        matcher: string
        value: string
    }
}
interface ModuleType extends ModuleConfig{file: string, content: string[]}
interface ModuleValue extends ModuleConfig{file: string, content: string}

const writeTemplate = (template: ComponentTemplate, setName: string, values: any)=>{
    // console.log('fil', {file_path: template.file_path})
    // console.time(`writting template ${setName} ${template.file_path}`)
    const replaced_path = template.file_path.replace(`${setName}/`, '')
    const dirname = path.dirname(replaced_path)
    const v = dirname==='.' ? '__default__' : dirname
    if(!values[v]){
        values[v] = {data: [] as any[], index: [], icons: [], react: {index: []} as any}
    }
    values[v].data.push({...pick(template, ['component_name', 'component_tag_name', 'name']), base_path: v})
    // const full_path = path.join(TEMPLATES_SRC_PATH, template.file_path)
    // const full_react_path = path.join(REACT_SRC_PATH, "icons", path.dirname(template.file_path))
    // console.log('base react', base_react_path)
    const base_path = template.file_path.replace(`${setName}/`, '').split(path.sep).pop()
    // console.log('base', {base_path, v, replaced_path, full: `${full_path}/${template.filename}`, def: `${full_path}/${template.definitionFileName}`})
    // console.log('writting', {full_path, full_react_path})
    // ensureDir(full_path)
    // writeFiles(`${full_path}/${template.filename}`, template.template, template.web_component_type, {matcher: 'src/', value: 'lib/'})
    // writeFiles(`${full_path}/${template.definitionFileName}`, template.definition, true, {matcher: 'src/', value: 'lib/'})
    // writeFiles(`${full_path}/index.ts`, template.index, true, {matcher: 'src/', value: 'lib/'})
    // ensureDir(full_react_path)
    // writeFiles(`${full_react_path}/${template.name}.tsx`, template.react_component, template.react_component_type, {matcher: 'react/icons', value: 'react/lib/icons'})
    values[v].index.push(`export {${template.component_name}} from "./${base_path}/index.js"`)
    values[v].icons.push(`import "./${base_path}/${template.name}.register.js"`)
    if(!values[v]["react"]){
        values[v]["react"] = {data: [] as any, index: []}
    }
    // values[v]["react"].index.push(`import "./${base_react_path}/${template.name}.js"`)
    values[v]["react"].index.push(`export {${template.component_name}} from "./${template.name}.js"`)
    // console.timeEnd(`writting template ${setName} ${template.file_path}`)
}
const writeComponents = async (setName: string, _templates: TreeTemplate, distDir: string, isModule = true)=>{
    let indexes = ''
    let icons = ''
    const component_pkgs :PkgExport[] = []
    const build_configs: any[] = []
    const templates = deduplicateByValue(_templates.files)
    // const vr = deduplicateByValue(templates.slice().map(t=>path.dirname(t.file_path.replace(`${setName}/`, '')).split(path.sep).filter(p=>p!=='.'))).filter(a=>a.length>0)
    const vr = deduplicateByValue(templates.slice().map(t=>path.dirname(t.replace(`${setName}/`, '')).split(path.sep).filter(p=>p!=='.'))).filter(a=>a.length>0)
    const react_packages_exports: PkgExport[] = []
    // console.log('variants', vr)
    // return;
    // const values: {[key: string]: ValueType & {react: Omit<ValueType, "icons">} } = {} as any
    const values = _templates
    console.log(`\n📦 Generating ${templates.length} templates for: ${setName}`);
    // for(const template of templates){
    //     // console.log('fil', {file_path: template.file_path})
    //     const replaced_path = template.file_path.replace(`${setName}/`, '')
    //     const dirname = path.dirname(replaced_path)
    //     const v = dirname==='.' ? '__default__' : dirname
    //     if(!values[v]){
    //         values[v] = {data: [] as any[], index: [], icons: [], react: {index: []} as any}
    //     }
    //     values[v].data.push({...pick(template, ['component_name', 'component_tag_name', 'name']), base_path: v})
    //     const full_path = path.join(TEMPLATES_SRC_PATH, template.file_path)
    //     const full_react_path = path.join(REACT_SRC_PATH, "icons", path.dirname(template.file_path))
    //     const base_react_path = path.dirname(template.file_path).replace(`${setName}/`, '').split(path.sep).pop();
    //     // console.log('base react', base_react_path)
    //     const base_path = template.file_path.replace(`${setName}/`, '').split(path.sep).pop()
    //     // console.log('base', {base_path, v, replaced_path, full: `${full_path}/${template.filename}`, def: `${full_path}/${template.definitionFileName}`})
    //     // console.log('writting', {full_path, full_react_path})
    //     ensureDir(full_path)
    //     writeFiles(`${full_path}/${template.filename}`, template.template, template.web_component_type, {matcher: 'src/', value: 'lib/'})
    //     writeFiles(`${full_path}/${template.definitionFileName}`, template.definition, true, {matcher: 'src/', value: 'lib/'})
    //     writeFiles(`${full_path}/index.ts`, template.index, true, {matcher: 'src/', value: 'lib/'})
    //     ensureDir(full_react_path)
    //     writeFiles(`${full_react_path}/${template.name}.tsx`, template.react_component, template.react_component_type, {matcher: 'react/icons', value: 'react/lib/icons'})
    //     values[v].index.push(`export {${template.component_name}} from "./${base_path}/index.js"`)
    //     values[v].icons.push(`import "./${base_path}/${template.name}.js"`)
    //     if(!values[v]["react"]){
    //         values[v]["react"] = {data: [] as any, index: []}
    //     }
    //     // values[v]["react"].index.push(`import "./${base_react_path}/${template.name}.js"`)
    //     values[v]["react"].index.push(`export {${template.component_name}} from "./${template.name}.js"`)
    //     // component_pkgs.push(construcPkgExport(template.file_path, template.component_name, {distDir: path.basename(distDir), includes: ['types', 'default'], addSrc: false, extensions: ['js', 'mjs']}))
    //     // component_pkgs.push(construcPkgExport(template.file_path, template.component_tag_name, {distDir: path.basename(distDir), includes: ['types', 'default'], addSrc: false, extensions: ['js', 'mjs']}))
    //     // component_pkgs.push(construcPkgExport(template.file_path, 'index', {distDir: path.basename(distDir), includes: ['types', 'default'], addSrc: false, extensions: ['js', 'mjs']}))
    //     // console.log('full template path', full_path)
    // }
    // return;
    // console.log('is module', isModule, vr)

    const addModule = (modules: ModuleType[], value: ModuleValue) => {
        const mod = modules.find(m=>m.file===value.file)
        if(mod){
            if(!mod.content.includes(value.content)){
                mod.content.push(value.content)
            }
        }else{
            modules.push({file: value.file, content: [value.content], matcher: value.matcher})
        }
    }
    if(isModule){
        const reversed = vr.slice().reverse()
        const modules: ModuleType[] = []
        const react_modules: ModuleType[] = []
        for(let i=0; i<reversed.length;i++){
            const main = reversed[i]
            for(let j=0; j<main.length;j++){
                const v = main[j]
                const relative_to_setname = path.join(setName, ...vr[i])
                // const tp = path.join(TEMPLATES_SRC_PATH, relative_to_setname)
                // const react_path = path.join(REACT_SRC_PATH, 'icons', relative_to_setname)
                const data = values[vr[i].join(path.sep)] as ValueType & {
                    react: Omit<ValueType, "icons">;
                };
                // console.log('data is', data)
                if(j===0){
                    if(data){
                        build_configs.push({
                            [`src/${relative_to_setname}/index.ts`]: {
                                formats: ["es"],
                                buildType: "bundled",
                                externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                            },
                            [`src/${relative_to_setname}/icons.register.ts`]: {
                                formats: ["es"],
                                buildType: "bundled",
                                externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                            }
                        })

                        // writeFiles(path.join(tp, `index.ts`), Array.from(new Set(data.index)).join('\n'), true, {matcher: 'src/', value: 'lib/'})
                        // writeFiles(path.join(tp, `icons.register.ts`), Array.from(new Set(data.icons)).join("\n"), true, {matcher: 'src/', value: 'lib/'})
                        // writeFiles(path.join(react_path, `index.ts`), Array.from(new Set(data.react.index)).join("\n"), true, {matcher: 'react/icons', value: 'react/lib/icons'})
                        // addModule(modules, {file: path.join(tp, `index.ts`), content: Array.from(new Set(data.index)).join('\n'), matcher: {matcher: 'src/', value: 'lib/'}})
                        // addModule(modules, {file: path.join(tp, `icons.register.ts`), content: Array.from(new Set(data.icons)).join("\n"), matcher: {matcher: 'src/', value: 'lib/'}})
                        // addModule(react_modules, {file: path.join(react_path, `index.ts`), content: Array.from(new Set(data.react.index)).join("\n"), matcher: {matcher: 'react/icons', value: 'react/lib/icons'}})
                    }else{
                        console.log('no value key', vr[i].join(path.sep), Object.keys(values))
                        
                    }
                }else{
                    const vv = main.slice().filter(s=>s!==v)
                    const imports_paths = main.slice().reverse().slice(j - 1 , 1)
                    // const tp = path.join(TEMPLATES_SRC_PATH, setName, ...vv)
                    // const react_path = path.join(REACT_SRC_PATH, 'icons', setName, ...vv)
                    const exports_data_index = `export * from "./${imports_paths.join(path.sep)}/index.js"`
                    const exports_data_icon = `export * from "./${imports_paths.join(path.sep)}/icons.register.js"`
                    const react_exports_data_index = `export * from "./${imports_paths.join(path.sep)}/index.js"`
                    // writeFiles(path.join(tp, `index.ts`), exports_data_index, true, {matcher: 'src/', value: 'lib/'})
                    // writeFiles(path.join(tp, `icons.register.ts`), exports_data_icon, true, {matcher: 'src/', value: 'lib/'})
                    // writeFiles(path.join(react_path, `index.ts`), react_exports_data_index, true, {matcher: 'react/icons', value: 'react/lib/icons'})
                    // // console.log('exporting', {main})
                    // if(tp.endsWith("24")){
                    //     console.log('write ic', {tp, main, reversed})
                    // }

                    // addModule(modules, {file: path.join(tp, `index.ts`), content: exports_data_index, matcher: {matcher: 'src/', value: 'lib/'}})
                    // addModule(modules, {file: path.join(tp, `icons.register.ts`), content: exports_data_icon, matcher: {matcher: 'src/', value: 'lib/'}})
                    // addModule(react_modules, {file: path.join(react_path, `index.ts`), content: react_exports_data_index, matcher: {matcher: 'react/icons', value: 'react/lib/icons'}})
                    // react_packages_exports.push(construcPkgExport(path.join('icons', setName, ...main), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js']}))
                    // react_packages_exports.push(construcPkgExport(path.join('icons', setName, ...main), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js'], isRoot: true}))
                    // for(const _value of main){
                    //     react_packages_exports.push(construcPkgExport(path.join('icons', setName, _value), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js']}))
                    //     react_packages_exports.push(construcPkgExport(path.join('icons', setName, _value), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js'], isRoot: true}))
                    // }
                    const arr = main.slice()
                    arr.pop()
                    while(arr.length>0){
                        react_packages_exports.push(construcPkgExport(path.join('icons', setName, ...arr), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js']}));
                        arr.pop()
                    }
                    // if(main.length>1){
                    //     react_packages_exports.push(construcPkgExport(path.join('icons', setName, ...vv), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js']}))
                    //     react_packages_exports.push(construcPkgExport(path.join('icons', setName, ...vv), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js'], isRoot: true}))
                    // }
                    build_configs.push({
                        [`src/${[setName, ...vv].join(path.sep)}/index.ts`]: {
                            formats: ["es"],
                            buildType: "bundled",
                            externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                        },
                        [`src/${[setName, ...vv].join(path.sep)}/icons.register.ts`]: {
                            formats: ["es"],
                            buildType: "bundled",
                            externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                        }
                    })
                    // component_pkgs.push(construcPkgExport(setName, '*', {distDir: path.basename(distDir), includes: ['types', 'default'], addSrc: false, extensions: ['js', 'mjs']}))
                    // console.log('next value key', tp, vv)
                }
            }
    
        }
        const all_modules = Array.from(new Set([...modules, ...react_modules]))
        const all_modules_files = Array.from(new Set(all_modules.map(m=>m.file)))
        for(const file of all_modules_files){
            const matches = all_modules.slice().filter(m=>m.file === file)
            const content = matches.slice().flatMap(m=>m.content).join(';\n')
            writeFiles(file, content, true, matches[0].matcher)
        }
        
        // const global_variants_index_export = vr.slice().map(v=>[`export * from "./${path.join(v[0], 'index')}.js"`])
        // const global_variants_icons_export = vr.slice().map(v=>[`import "./${path.join(v[0], 'icons.register')}.js"`])
        // console.log('write ic', {icons, vr, setName, global_variants_index_export, global_variants_icons_export})
        // writeFiles(path.join(TEMPLATES_SRC_PATH, setName, `index.ts`), Array.from(new Set(global_variants_index_export.slice().flat())).join('\n'), true, {matcher: 'src/', value: 'lib/'})
        // writeFiles(path.join(TEMPLATES_SRC_PATH, setName, `icons.register.ts`), Array.from(new Set(global_variants_icons_export.slice().flat())).join('\n'), true, {matcher: 'src/', value: 'lib/'})
        // const global_react_variants_index_export = vr.slice().map(v=>[`export * from "./${path.join(v[0], 'index')}.js"`])
        // writeFiles(path.join(REACT_SRC_PATH, 'icons', setName, `index.ts`), Array.from(new Set(global_react_variants_index_export.slice().flat())).join('\n'), true, {matcher: 'react/icons', value: 'react/lib/icons'})
        
    }else{
        const value = values['__default__'] as ValueType & {
            react: Omit<ValueType, "icons">;
        }
        if(value){
            // console.log('value is defined')
            const indexes = value.index;
            const icons = value.icons;
            const react_index = value.react.index;
            build_configs.push({
                [`src/${setName}/index.ts`]: {
                    formats: ["es"],
                    buildType: "bundled",
                    externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                },
                [`src/${setName}/icons.register.ts`]: {
                    formats: ["es"],
                    buildType: "bundled",
                    externals: ["lit", "@lit/reactive-element", "lit-html/directives/unsafe-html.js", "lit-html/directives/unsafe-svg.js", "@fluixi/helpers", "@fluixi/helpers/components/mixins", "icons/icon-heroicons", "icons/icon-lucide", "icons/icon-remix", "icons/icon-lucide/src/icons-map.js", "icons/icon-heroicons/src/icons-map.js", "icons/icon-remix/src/icons-map.js"],
                }
            })
            react_packages_exports.push(construcPkgExport(path.join('icons', setName), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js']}))
            react_packages_exports.push(construcPkgExport(path.join('icons', setName), 'index', {includes: ['types', 'default'], distDir: 'dist', 'extensions': ['js'], isRoot: true}))
            // writeFiles(path.join(TEMPLATES_SRC_PATH, setName, `index.ts`), Array.from(new Set(indexes)).join("\n"), true, {matcher: 'src/', value: 'lib/'})
            // writeFiles(path.join(TEMPLATES_SRC_PATH, setName, `icons.register.ts`), Array.from(new Set(icons)).join("\n"), true, {matcher: 'src/', value: 'lib/'})
            // writeFiles(path.join(REACT_SRC_PATH, 'icons', setName, `index.ts`), Array.from(new Set(react_index)).join("\n"), true, {matcher: 'react/icons', value: 'react/lib/icons'})
        }
        // return
    }
    
    component_pkgs.push(construcPkgExport(setName, '*', {distDir: `${path.basename(distDir)}/src`, includes: ['types', 'default'], addSrc: true, extensions: ['js', 'cjs']}))
    // updatePackageJson(TEMPLATES_BASE_PATH, component_pkgs)
    return "ok"
    
}

const writeFiles = (file: string, code: string, types: string | boolean = true, replace: {matcher: string, value: string} = {matcher: 'src/', value: 'dist/src/'})=>{
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, code, "utf8");
    const {dts_path, js_path} = getPathMatcher(file, replace)
    let data_types = ''
    if(typeof types === 'string'){
        data_types = types
    }
    const {js, types: _types} = compile(code, file, {...replace, compileTypes: typeof types === 'string' ? false : types})
    if(data_types.length===0){
        data_types = _types
    }
    // console.log('group map', file)
    if(js.length>0){
        ensureDir(path.dirname(js_path));
    }
    fs.writeFileSync(js_path, js, "utf8");
    if(data_types.length>0){
        ensureDir(path.dirname(dts_path));
        fs.writeFileSync(dts_path, data_types, "utf8");
    }

}


const generateBuildHistory = (project_name: string, options: {start: number, end: number})=>{
    const file_path = path.join(cwd(), 'generate-history.json')
    const {start, end} = options
    const toMinutesOrSeconds = (value: number) =>{
        if(value>60){
            return `${Math.round(value/60)} minutes`
        }
        return `${value} seconds`
    }
    const value = {
        compiledIn: toMinutesOrSeconds(end - start),
        compiledAt: new Date().toISOString()
    }
    if(!fs.existsSync(file_path)){
        fs.writeFileSync(file_path, JSON.stringify({
            [project_name]: value
        }))
    }else{
        const data = JSON.parse(fs.readFileSync(file_path, 'utf-8'))
        data[project_name] = value
        fs.writeFileSync(file_path, JSON.stringify(data))
    }
}
async function generateIconsModules(test: boolean = false) {
    const default_excluded = [".DS_Store", "node_modules"]
    const iconSetsFilter = process.env.ICON_SETS
        ? new Set(process.env.ICON_SETS.split(',').map(s => s.trim()))
        : null;
    const allDirs = fs.readdirSync(PACKAGES_DIR, {withFileTypes: true}).map(d=>d.isDirectory() ? d.name : null).filter(a=>a!==null).filter(de=>!default_excluded.some(d=>de===d));
    const dirs = iconSetsFilter
        ? allDirs.filter(d => iconSetsFilter.has(d.replace(/^icon-/, '')))
        : allDirs;
    if (iconSetsFilter) console.log(`[ICON_SETS] filtering to: ${dirs.join(', ')}`);
    // const whitelist_packages = ["icon-heroicons"]
    const whitelist_packages: string[] = []
    const libraries: string[] = dirs.slice().map(d=>d.replace(/^icon-/, ""));
    // const libraries: string[] = []
    const buildStart = Date.now();
    
    for(const dir of dirs){
        const pkgDir = path.join(PACKAGES_DIR, dir);
        const registry_results: RegistyResult[] = []
        const full_maps: {map: string, file: string, write_path: string}[] = []
        if(whitelist_packages.length>0 && !whitelist_packages.some(e=>e===dir)) continue
        const pkgs: PkgExport[] = []
        console.time(`building icons for ${dir}`)
        if (fs.lstatSync(pkgDir).isDirectory()){
            console.time(`generate icons for ${dir}`)
            const generated  = await generateAll(pkgDir);
            console.timeEnd(`generate icons for ${dir}`)
            if(generated){
                const {ast, setName, srcDir, outIconsDir, map: map, files_import_map, pkgs: _pkgs, distDir, templates} = generated
                pkgs.push(..._pkgs)
                // fs.writeFileSync(path.join(outIconsDir, `${setName}.json`), JSON.stringify(map, null, 2));
                const variants: string[] = ast.slice().map(a=>a.folder!=='icons' ? a.folder : null).filter(a=>a!==null)
                const registry_maps: {
                    setname: string;
                    options: AstExportOption[];
                }[] = []
                console.time('write ast files from ast lib result')
                for(const ast_lib of ast){
                    const files_lib = ast_lib.ast.slice().filter(s=>s.lib==='__file__');
                    const f = files_lib.map(f=>({setname: f.setName!, options: f.exportOptions.slice().filter(o=>o.exportType==='map' && o.exportParams?.some(p=>p.file==="imports-maps"))}))
                    registry_maps.push(...f)
                    const write = await transformAst(ast_lib.ast, setName, libraries, variants)
                    registry_results.push(...write)
                }
                console.timeEnd('write ast files from ast lib result')

                console.time('last module write')
                const uniqueFiles = Array.from(new Set(registry_results.slice().map(r=>r.file)))
                const combined_variants = Array.from(new Set(ast.slice().flatMap(a=>a.variants ?? []))).filter(v=>v.length>0).filter(v=>v!=="icons")
                const isModule = combined_variants.length>1
                const base_module_keys: string[] = []
                const maps: {map: string, file: string, write_path: string}[] = []
                if(!isModule){
                    const d = fs.readdirSync(outIconsDir, { withFileTypes: true }).map(e=>e.isFile() ? e.name : '').filter(a=>a.length>0)
                    base_module_keys.push(...d)
                }else{
                    // console.log('is module')
                    const variants_path = Array.from(new Set(combined_variants.flatMap(variant=>{
                        const splitted = variant!.split('.')
                        const abspath = path.join(outIconsDir, ...splitted)
                        return [abspath, ...splitted.map((s, i)=>path.join(outIconsDir, ...splitted.slice(0, i+1)))].filter(a=>a.length>0)
                    })))
    
                    variants_path.push(outIconsDir)
                    if(variants_path.length>1){
                        //Here the setname is a module with sub folders
                        for(const file of variants_path){
                            // const mp = getMapPath(file, outIconsDir)
                            // const mp = getMapPath(file, outIconsDir, false)
                            // console.log('writing f', {file, variants, mp})
                            // if(combined_variants.some(v=>v===mp.replaced.join('.'))){
                            //     try{
                            //         const d = fs.readdirSync(file, { withFileTypes: true }).map(e=>e.isFile() ? e.name : '').filter(a=>a.length>0)
                            //         maps.push(writeParentImportMap(file, outIconsDir, map, combined_variants, d))
                            //         // pkgs.push(construcPkgExport(getRelativeImportPath(outIconsDir, srcDir!)!, IMPORT_FILE, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                                    
                            //     }catch(errWrite){
                            //         console.error(`failed to read dir sync ${file}`)
                            //         throw Error(`failed to read dir sync ${file}`)
                            //     }
                            // }else{
                            //     if(!maps.some(m=>m.file===file)){
                            //         if(file!==outIconsDir){
                            //             maps.push(writeParentImportMap(file, outIconsDir, map, combined_variants, [], isModule))
                            //             // pkgs.push(construcPkgExport(getRelativeImportPath(outIconsDir, srcDir!)!, IMPORT_FILE, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                            //         }
                            //     }
                            // }
                            if(!full_maps.some(m=>file===m.file)){
                                if(file!==outIconsDir){
                                    full_maps.push(writeFullImportMap(file, outIconsDir, setName, map, combined_variants, true))
                                    pkgs.push(construcPkgExport(getRelativeImportPath(outIconsDir, srcDir!)!, ALL_FILES, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                                    
                                }
                            }
                        }
    
                    }else{
                        //single package icons contains directly all svg files
                    }
                }
                full_maps.push(writeFullImportMap(outIconsDir, outIconsDir, setName, map, combined_variants,  isModule))
                pkgs.push(construcPkgExport(getRelativeImportPath(outIconsDir, srcDir!)!, ALL_FILES, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                // maps.push(writeParentImportMap(outIconsDir, outIconsDir, map, combined_variants, isModule ? [] : base_module_keys, isModule))
                // pkgs.push(construcPkgExport(getRelativeImportPath(outIconsDir, srcDir!)!, IMPORT_FILE, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                
                for(const file of uniqueFiles){
                    const items = registry_results.slice().filter(r=>r.file===file)
                    const {values: _imports} = groupImports(items.slice().map(i=>i.imported).flat())
                    const {values: _exports} = groupExports(items.slice().map(i=>i.exported).flat())
                    const exports_registries = items.slice().flatMap(i=>i.context_exports).flatMap(e=>e.data).flatMap(e=>({registry:e.registry ?? [], selector: e.selector!})).filter(e=>e.registry.length>0 && e.selector.length>0)
                    const unique_registries = Array.from(new Set(exports_registries.map(e=>({registry: e.registry, selector: e.selector}))))
                    const registry_code = unique_registries.map(r=>createRegistyWindowMap([setName, ...r.registry], r.selector, libraries, variants)).join('\n')
                    const imported_codes = importToString(_imports)
                    const exported_codes = exportToString(_exports)
                    
                    const code = `${imported_codes}\n\n${exported_codes.code}\n${registry_code.length > 0 ? registry_code  + '\n': ''}\n`;
                    if(imported_codes.length===0 && exported_codes.code.length===0) continue
                    // const formatted_code = await formatCode(code, {parser: 'typescript'})
                    const formatted_code = code
                    const baseName = path.basename(file)
                    let path_relative = getRelativeImportPath(file, srcDir)

                    // console.log('path relative', {path_relative, baseName, dist: path.basename(distDir)})
                    pkgs.push(construcPkgExport(path_relative!, baseName!, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                    // console.log('write uniq', file)
                    // if(file.endsWith("24/index")){
                    //     console.log('code is', formatted_code)
                    // }
                    writeFiles(`${file}.ts`, formatted_code)

                }
                const unique_write = Array.from(new Set(maps.slice().map(m=>m.write_path).concat(full_maps.slice().map(m=>m.write_path))))
                for(const file of unique_write){
                    // console.log('write grouped', file)
                    const grouped_map = maps.slice().filter(m=>m.write_path===file)
                    const grouped_full_map = full_maps.slice().filter(m=>m.write_path===file)
                    if(grouped_map.length > 0){
                        const map = grouped_map.map(m=>m.map).join('\n')
                        // const formatted_code = await formatCode(`const map = {${map}}\nexport default map;\nexport {map}\n`, {parser: 'typescript'})
                        const formatted_code = `const map = {${map}}\nexport default map;\nexport {map}\n`
                        writeFiles(`${file}`, formatted_code)
                    }
                    if(grouped_full_map.length > 0){
                        const map = grouped_full_map.map(m=>m.map).join('\n')
                        try{
                            // const formatted_code = await formatCode(`const map = {${map}}\nexport default map;\nexport {map}\n`, {parser: 'typescript'})
                            const formatted_code = `const map = {${map}}\nexport default map;\nexport {map}\n`
                            const baseName = path.basename(file).split('.')[0]
                            let path_relative = getRelativeImportPath(file, srcDir)
                            // console.log('group map full', file)
                            // console.log('writting file', file)
                            // if(file.endsWith('index.ts')){
                            // }
                            writeFiles(`${file}`, formatted_code)
                            
                            pkgs.push(construcPkgExport(path_relative!, baseName!, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                        }catch(errFormat){
                            console.error(`Failed to format code ${file}`, errFormat)
                            throw Error(`Failed to format code ${file}`)
                        }
                    }
                }
                await generateGlobalRegistryAll({setName, srcDir} as any);
                // console.log('i', files_import_map)
                // await generateGlobalRegistryImportMap({setName, srcDir} as any, files_import_map, combined_variants);
                await generateGlobalRegistryIndex({setName, srcDir} as any, INDEX_FILE, combined_variants);
                pkgs.push(construcPkgExport('', ALL_FILES, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                // pkgs.push(construcPkgExport('', IMPORT_FILE, {distDir: path.basename(distDir), includes: ['types', 'default', "import", "require"], addSrc: true}))
                await writeComponents(setName, templates, distDir, isModule)
                const all_variants = Array.from(new Set(registry_results.map(r=>r.variants).flat()))
                const dts_file = path.join(srcDir, "registry.d.ts");
                const types_declare = declareInterface(libraries, combined_variants);
                // const code = await formatCode(types_declare, {parser: 'typescript'})
                const code = types_declare
                fs.writeFileSync(dts_file, code.trim() + "\n");
                // const template = await generateComponentTemplate(setName, combined_variants)
                // fs.writeFileSync(path.join(srcDir, 'template.ts'), template)
                // console.log('pkgs', deduplicateByValue(pkgs))
                updatePackageJson(pkgDir, deduplicateByValue(pkgs));
                console.timeEnd('last module write')
            }
            
        }
        console.timeEnd(`building icons for ${dir}`)
        generateBuildHistory(dir.replace(/^icon-/, ""), {start: buildStart, end: Date.now()})
    }
    await generateGlobalRegistry({srcDir: PACKAGES_DIR} as any, INDEX_FILE)
    // await generateGlobalRegistry({srcDir: PACKAGES_DIR} as any, IMPORT_FILE)
    await generateGlobalRegistry({srcDir: PACKAGES_DIR} as any, ALL_FILES)
    // writeFullReactIndex(libraries.slice())
    console.log("🎉 All icons generated successfully!");
    return whitelist_packages
}

export {
    generateIconsModules
}