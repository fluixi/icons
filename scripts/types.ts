export interface GeneratorParams{
    pkgName?: string;
    setName?: string;
    srcDir?: string;
    destDir?: string;
    outIconsDir?: string;
    licenseInfo?: string;
    baseName?: string;
    pascalName?: string;
    varName?: string
    kebabName?: string
}

export interface IconNode extends GeneratorParams {
    name: string;
    path: string;
    isDir: boolean;
    children?: IconNode[];
    parents?: IconNode[]
    parentDir?: string
    safe_path: string
}

export type IInclude = 'import' | 'require' | 'default' | 'types'

export interface PkgExport{
    [key: string]: {
        default: string;
        require: string;
        import: string;
        types: string;
    }
}