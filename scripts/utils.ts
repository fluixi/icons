import path from "path";
import fs from "fs"
import type { IInclude, PkgExport } from "./types";

type Fn = (...args)=> any;
const state = {cache: new Map<string, any>()}

export const clearState = ()=>{
    // state.cache.clear()
    return;
}
export const memoizeFn = <T extends Fn>(fn: T)=>{
  const cache: Map<string, any> = state.cache
  return (...args)=> {
    const key = fn.name + JSON.stringify(args)
    // const n = args[0];
    if (cache.has(key)) {
      // console.log('Fetching from cache', {name: fn.name});
      const result = cache.get(key);
      if(result!==undefined && result!==null){
        if(typeof result === "object"){
          if(Array.isArray(result)){
            return result.slice() as ReturnType<T>;
          }else{
            return {...result} as ReturnType<T>;;
          }
        }
      }
      return result as ReturnType<T>;
    }else {
      // console.log('Calculating result');
      let result = (fn as any)(...args);
        if(result!==undefined && result!==null && typeof result === "object"){
          if(Array.isArray(result)){
            cache.set(key, result.slice())
          }else{
            // cache.set(key, {...result})
          }
      }else{
        // cache.set(key, result)
      }
      // cache[key as any] = result;
      return result as ReturnType<T>;
    }
  }
}

function _sanitizeName(name: string) {
    return name.replace(/&/g, '_').replace(/[^a-zA-Z0-9_-]/g, "");
}

export const sanitizeName = memoizeFn(_sanitizeName)


function _toPascalCase(str: string) {
    return str
        .replace(/[-_]+/g, " ")
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0) // Remove empty strings
        .map(word => {
            if (word.length === 1) {
                return word.toUpperCase(); // Single letters should be uppercase
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
}

export const toPascalCase = memoizeFn(_toPascalCase)

function _capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const capitalize = memoizeFn(_capitalize)

export function construcPkgExport(basePath: string, filename: string, options: {
    includes?: IInclude[], distDir?: string, addSrc?: boolean, extensions?: string[], isRoot?: boolean} = {includes: ['import', 'require', 'default', 'types'], distDir: 'dist', extensions: ['js'], isRoot: false}): PkgExport{
    const {includes = ['import', 'require', 'default', 'types'], distDir = 'dist', addSrc = false, extensions = ["js"], isRoot = false} = options
    const isDefault = includes.includes('default')
    const isImport = includes.includes('import')
    const isRequire = includes.includes('require')
    const isTypes = includes.includes('types')
    const base = basePath.length > 0 ? `${basePath}` : '';
    const hasMjs = extensions.some(e=>e==='mjs')
    const hasCjs = extensions.some(e=>e==='cjs')
    let result = {} as any
    for(const extension of extensions){
        const dist_base_path = path.join(distDir, base, filename)
        const props = {
            ...(isTypes && {types: `./${dist_base_path}.d.ts`}),
            ...(isDefault && {default: `./${dist_base_path}.${extension}`}),
            ...((isImport && extension!=='cjs') && {import: `./${dist_base_path}.${extension}`}),
            ...((isRequire && extension!=='mjs') && {require: `./${dist_base_path}.${extension}`}),
        }
        result = {...result,  [`./${isRoot ? base : path.join(base, filename)}`]: props,
            ...(!isRoot && {[`./${path.join(base, filename)}.${extension}`]: props}),
            ...(addSrc && {[`./${path.join('src', base, filename)}`]: props}),
            ...(addSrc && {[`./${path.join('src', base, filename)}.${extension}`]: props}),}

    }
    return result as PkgExport
}

export const _deduplicateByValue = <T>(arr: T[]): T[] => {
    if (arr.length === 0) return arr;
    
    // Check if it's an array of primitives
    const isPrimitive = typeof arr[0] !== 'object' || arr[0] === null;
    
    if (isPrimitive) {
        return [...new Set(arr)];
    }
    
    // For objects, use JSON.stringify for comparison
    const seen = new Set();
    const values: any[] = []
    for (let i=0; i<arr.length; i++){ {
        const item = arr[i];
        const serialized = JSON.stringify(item);
        if (seen.has(serialized)) continue;
        seen.add(serialized);
        values.push(item);
    }
    }
    return values
    // return arr.filter(item => {
    //     const serialized = JSON.stringify(item);
    //     return seen.has(serialized) ? false : seen.add(serialized);
    // });
};
export const deduplicateByValue = <T>(arr: T[]): T[] => {
    const values = _deduplicateByValue(arr);
    const results: T[] = []
    for(let i=0; i<values.length; i++){
        const value = values[i];
        if(value===undefined || value===null) continue
        if(typeof value==='object'){
            if(!Array.isArray(value)){
                const keys =  Object.keys(value as any);
                const _value = {} as any
                for(const key of keys){
                    if(Array.isArray(value[key])){
                        _value[key] = _deduplicateByValue(value[key])
                    }else{
                        _value[key] = value[key]
                    }
                }
                results.push(_value)
            }else{
                results.push(_deduplicateByValue(value) as any)
            }
        }else{
            results.push(value)
        }
    }
    return results
    // return arr.filter(item => {
    //     const serialized = JSON.stringify(item);
    //     return seen.has(serialized) ? false : seen.add(serialized);
    // });
};


const _safePath = (_path: string)=>{
    const parts = _path.split('.');
    let extension = ''
    if(parts.length>1){
        extension = parts.slice()[1];
        parts.pop()
    }
    let base = parts.join('.').split(path.sep).map(p=>sanitizeName(p).toLowerCase()).join(path.sep);
    if(extension.length>0){
        base+=`.${extension}` 
    }
    return base
}
export const safePath = memoizeFn(_safePath)

const _getParentDir = (_path: string)=>{
    const split = _path.split(path.sep)
    if(split.length>1){
        split.pop();
    }
    const url = path.join(...split)

    return path.normalize("/" + url)
}

export const getParentDir = memoizeFn(_getParentDir)

function _getIconShorthand(_name: string){
    const name = _name.replace('icon-', '')
    if(name==='font-awesome'){
        return `Fa`
    }
    if(name==='heroicons'){
        return `Hi`
    }
    if(name==='remix'){
        return `Ri`
    }
    if(name==='material-design'){
        return `Md`
    }
    if(name==='tabler'){
        return `Tr`
    }
    if(name==='internal'){
        return `Adf`
    }
    if(name==='lucide'){
        return `Lu`
    }
    if(name==='phosphor'){
        return `Ph`
    }
    if(name==='bootstrap'){
        return `Bi`
    }
    if(name==='iconoir'){
        return `Io`
    }
    console.log('name not found', name)
    return name
}

export const getIconShorthand = memoizeFn(_getIconShorthand)



export function updatePackageJson(pkgDir: string, pkgExported: PkgExport[], test: boolean = false) {
    const pkgJsonPath = path.join(pkgDir, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    if(!pkgJson.exports) pkgJson.exports = {};
    for(const exp of pkgExported){
        for (const [key, value] of Object.entries(exp)) {
            pkgJson.exports[key] = value;
        }
    }
    // pkgJson.exports = deduplicateByValue(pkgJson.exports)
    if(!test){
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    }else{
        console.log('new pkg exported for '+ pkgDir, pkgJson.exports);
    }
}

interface EntryBuild {
    compoenent_name: string;
    compoenent_tag_name: string;
}
export function updateBuildConfigJson(pkgDir: string, pkgExported: any[], test: boolean = false) {
    const pkgJsonPath = path.join(pkgDir, "build-config.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    if(!pkgJson.rollup) pkgJson.rollup = {};
    if(!pkgJson.rollup.entries) pkgJson.rollup.entries = {};
    for(const exp of pkgExported){
        for (const [key, value] of Object.entries(exp)) {
            pkgJson.rollup.entries[key] = value;
        }
    }
    // pkgJson.exports = deduplicateByValue(pkgJson.exports)
    if(!test){
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    }else{
        console.log('new pkg exported for '+ pkgDir, pkgJson.entries.rollup);
    }
}


export function mergeNames(name1: string, name2: string){
    return name1 + "-" + name2
    // const s1 = name1.split('-')
    // const s2 = name2.split('-')
    // const result: string[] = [...s1];
    // let index = 0
    // for(const s of s2){
    //     if(!result.some(ss=>ss===s)){
    //         result.push(s)
    //     }else{
    //         if(index>0){
    //             result.push(s)
    //         }
    //     }
    //     index+=1
    // }
    // if(name1.includes('zoom-in')){
    //     console.log('mergin', {name1, name2, result})
    // }
    // return result.join('-')

}
export const uniqBy = <T>(arr: T[], key: keyof T) => {
    const seen = new Set();
    return arr.filter((item) => {
      const k = item[key];
      return seen.has(k) ? false : seen.add(k);
    });
}

export const ensureDir = (dir: string) => fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true });

// export const ensureDir = memoizeFn(_ensureDir)
export const pick = (object: any, keys: string[]) => {
    if(keys.length===0) return object
    const obj = structuredClone(object)
    // const object_keys = Object.keys(obj)
    // const object_keys = new Map(Object.entries(obj))
    const result = {}
    for(const key of keys){
        if(result[key] === "undefined") continue
        result[key] = obj[key]
        // if(object_keys.keys().some(k=>k.toString()===key.toString())){
        // }
        // delete obj[key]
    }
    return result
    // return keys.reduce((acc, key) => {
    //     acc[key] = object[key]
    //     return acc
    // }, {})
}
export const omit = (object: any, keys: string[]) => {
    if(keys.length===0) return object
    if(!object) return object
    const obj = structuredClone(object)
    const object_keys = Object.keys(obj)
    const result = {}
    for(const key of object_keys){
        if(!keys.some(k=>k.toString()===key.toString())){
            result[key] = obj[key]
        }
        // delete obj[key]
    }
    return result
    // return keys.reduce((acc, key) => {
    //     acc[key] = object[key]
    //     return acc
    // }, {})
}

export const getValueDeep = (obj: any, keys: string[], init=false) =>{
    return keys.reduce((acc, key) => acc && acc[key], obj);
}

export function toJSONString(value: any, space = 0, matcher?: {fn: (key: string) => boolean, transformer: (value: any) => any}) {
    const seen = new WeakSet();
    const gap = (n: number) => (space ? ' '.repeat(n) : '');
    const nl = (n: number) => (space ? `\n${' '.repeat(n)}` : '');
  
    const _transform = (value: any)=>{
        if(matcher){
            if(matcher.fn(value)){
                return matcher.transformer(value)
            }
        }
        return `"${esc(value)}"`
    }
    const esc = (s: string) =>
      s.replace(/[\u0000-\u001F"\\]/g, c => {
        switch (c) {
          case '"': return '\\"';
          case '\\': return '\\\\';
          case '\b': return '\\b';
          case '\f': return '\\f';
          case '\n': return '\\n';
          case '\r': return '\\r';
          case '\t': return '\\t';
          default:
            const code = c.charCodeAt(0).toString(16).padStart(4, '0');
            return `\\u${code}`;
        }
      });
  
    const ser = (v: any, indent: number): string => {
      if (v === null) return 'null';
      const t = typeof v;
      if (t === 'number') return Number.isFinite(v) ? String(v) : 'null';
      if (t === 'boolean') return v ? 'true' : 'false';
      if (t === 'string'){
        return _transform(v)
      };
      if (t === 'bigint') return `"${String(v)}"`;
      if (t === 'function' || t === 'undefined' || t === 'symbol') return undefined as any;
  
      if (Array.isArray(v)) {
        if (seen.has(v)) throw new TypeError('Converting circular structure to JSON');
        seen.add(v);
        const next = indent + space;
        const parts = v.map(x => {
          const s = ser(x, next);
          return s === undefined ? 'null' : s;
        });
        seen.delete(v);
        if (!space) return `[${parts.join(',')}]`;
        return `[${nl(next)}${parts.join(`,${nl(next)}`)}${nl(indent)}]`;
      }
  
      if (t === 'object') {
        if (seen.has(v)) throw new TypeError('Converting circular structure to JSON');
        seen.add(v);
        const keys = Object.keys(v);
        const next = indent + space;
        const parts: string[] = [];
        for (const k of keys) {
          const s = ser(v[k], next);
          if (s !== undefined) {
            if (!space) parts.push(`${_transform(k)}:${s}`);
            else parts.push(`${gap(next)}${_transform(k)}: ${s}`);
          }
        }
        seen.delete(v);
        if (!space) return `{${parts.join(',')}}`;
        return `{\n${parts.join(',\n')}\n${gap(indent)}}`;
      }
    //   console.log('t', t)
      return undefined as any;
    };
  
    const out = ser(value, 0);
    return out === undefined ? undefined : out;
}

export function objectFromArrayKeys(object: any, keys: string[], default_value = {} as any, debug = false){
    let i = 0;
    let data_map = object;
    // if(debug){
    //     console.log('before', object)

    // }
    if(keys.length===0){
        // console.log('keys null map', object, default_value)
        if(typeof object === 'object' && object!==null){
            if(typeof default_value === 'object' && !Array.isArray(default_value)){
                const keys = new Map(Object.entries(default_value))
                // console.log('keys', Object.keys())
                for(const [k, value] of keys){
                    object[k] = default_value[k]
                }
                // Object.keys(default_value).forEach(k=>{
                //     object[k] = default_value[k]
                // })
                // object = {...object, ...default_value}
            }
        }else{
            if(typeof default_value === 'string'){
                if(typeof object === 'string'){
                    object += default_value
                }else{
                    object = default_value
                }
            }else{
                object = default_value
    
            }
        }
        // object = {...object,...data_map}
        return object
    }
    while(i<keys.length){
        const key = keys[i]
        if(debug){

            // console.log('key', key, data_map, default_value)
        }
        if(!data_map){
            data_map = {}
        }
        if(!data_map[key]){
            data_map[key] = {}
        }
        if(i===keys.length-1){
            if(typeof default_value === "object" && !Array.isArray(default_value)){
                data_map[key] = {...data_map[key], ...default_value}
            }else{
                if(typeof default_value === 'string'){
                    if(typeof data_map[key] === 'string'){
                        data_map[key] += default_value
                    }else{
                        data_map[key] = default_value
                    }
                }else{
                    data_map[key] = default_value
                }
            }
        }
        if(typeof data_map[key] === 'object'){
            data_map = data_map[key]
        }
        i+=1
    }
    return data_map
}

export const addOption = <T>(option: T, options: T[])=>{
    const set = new Set(options.slice())
    // const opts = options.slice()
    if(!set.has(option)){
        options.push(option)
    }else{
        console.log('option already exist')
    }
    // options.splice(0)
    // options.push(...deduplicateByValue(opts))
}
export const addOptions = <T>(values: T[], options: T[])=>{
    const opts = options.slice()
    for(const v of values){
        addOption(v, opts)
    }
    options.splice(0)
    // options.push(...deduplicateByValue(opts))
    options.push(...deduplicateByValue(opts))
    // console.log('option added', options.length, deduplicateByValue(options).length)
    // console.log('option added', options.length)
}

// export const addOption = <T>(option: T, options: T[])=>{
//     const set = new Set(options)
//     if(!set.has(option)){
//         options.push(option)
//     }
// }
// export const addOptions = <T>(values: T[], options: T[])=>{
//     for(const v of values){
//         addOption(v, options)
//     }
// }
export const removeUrlParts = (url: string, index: number)=>{
    let parts = url.split(path.sep)
    if(index < 0){
        parts = parts.slice(0, index)
    }else{
        parts.splice(index, 1)

    }
    return parts.join('/')
}