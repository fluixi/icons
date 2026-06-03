import ts from "typescript";
import path from "path";

// export const generateTypes = (code: string, file: string)=>{
//     const lines = code
//     .split("\n")
//     .map(line => {
//       line = line.trim();
//       if (!line) return "";
//       // Add `declare` if not already present
//       if (!line.startsWith("declare") && !line.startsWith("export declare")) {
//         if (line.startsWith("export ")) {
//           return line.replace(/^export /, "export declare ");
//         } else {
//           return `declare ${line}`;
//         }
//       }
//       return line;
//     })
//     .join("\n");

//     // console.log('filename', path.basename(file))
//     const sourceFile = ts.createSourceFile(
//         path.basename(file),
//         lines,
//         ts.ScriptTarget.ESNext,
//         false,
//         ts.ScriptKind.TS
//       );
    
//       const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
//       const dtsContent = printer.printFile(sourceFile);
//       return dtsContent
// }



/**
 * Generate a .d.ts declaration string from a single TypeScript source string.
 * Uses the same background as tsc (full type inference, JSX, libs, etc.).
 */
// export function generateDtsFromSingleFile(
//   fileName: string,
//   source: string,
//   options?: ts.CompilerOptions
// ): string {
//   const compilerOptions: ts.CompilerOptions = {
//     declaration: true,
//     emitDeclarationOnly: true,
//     module: ts.ModuleKind.ESNext,
//     target: ts.ScriptTarget.ESNext,
//     jsx: ts.JsxEmit.ReactJSX,
//     esModuleInterop: true,
//     skipLibCheck: true,
//     strict: true,
//     ...options,
//   };

//   const output: Record<string, string> = {};

//   const host = ts.createCompilerHost(compilerOptions);

//   // Provide our single in-memory source file
//   host.getSourceFile = (name, lang) => {
//     if (name === fileName) {
//       return ts.createSourceFile(name, source, lang);
//     }

//     // Fallback to built-in lib definitions (like lib.esnext.d.ts)
//     const libPath = ts.getDefaultLibFilePath(compilerOptions);
//     const base = libPath.substring(0, libPath.lastIndexOf("/"));
//     try {
//       const fs = require("fs");
//       if (name.startsWith("lib.") && fs.existsSync(`${base}/${name}`)) {
//         const text = fs.readFileSync(`${base}/${name}`, "utf8");
//         return ts.createSourceFile(name, text, lang);
//       }
//     } catch {}
//     return undefined;
//   };

//   host.writeFile = (fileName, text) => {
//     output[fileName] = text;
//   };

//   const program = ts.createProgram([fileName], compilerOptions, host);
//   program.emit();

//   const result = Object.entries(output).find(([n]) => n.endsWith(".d.ts"));
//   if (!result) throw new Error("No .d.ts output generated");
//   return result[1];
// }

/**
 * Generate .d.ts content from a TypeScript string using the same logic as `tsc`
 * @param fileName Virtual file name, e.g. "temp.ts"
 * @param source TypeScript code as string
 * @returns Generated .d.ts string
 */
export function generateTypes(source: string, file: string, options?: any): string {
  // Create an in-memory compiler host
  const fileName = path.basename(file);
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
    ...options,
  };

  const output: Record<string, string> = {};

  const host = ts.createCompilerHost(compilerOptions);

  // Provide our single in-memory source file
  host.getSourceFile = (name, lang) => {
    if (name === fileName) {
      return ts.createSourceFile(name, source, lang);
    }

    // Fallback to built-in lib definitions (like lib.esnext.d.ts)
    const libPath = ts.getDefaultLibFilePath(compilerOptions);
    const base = libPath.substring(0, libPath.lastIndexOf("/"));
    try {
      const fs = require("fs");
      if (name.startsWith("lib.") && fs.existsSync(`${base}/${name}`)) {
        const text = fs.readFileSync(`${base}/${name}`, "utf8");
        return ts.createSourceFile(name, text, lang);
      }
    } catch {}
    return undefined;
  };

  host.writeFile = (fileName, text) => {
    output[fileName] = text;
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  program.emit();

  const result = Object.entries(output).find(([n]) => n.endsWith(".d.ts"));
  if (!result) throw new Error("No .d.ts output generated");
  return result[1];
//   const compilerOptions: ts.CompilerOptions = {
//     noImplicitAny: true,
//     declaration: true,
//     emitDeclarationOnly: true,
//     module: ts.ModuleKind.ESNext,
//     target: ts.ScriptTarget.ESNext,
//     skipLibCheck: true,
//     strict: true,
//     esModuleInterop: true,
//   };

//   const sourceFiles = new Map<string, string>([[fileName, source]]);
//   const outputFiles = new Map<string, string>();

//   const host: ts.CompilerHost = {
//     getSourceFile: (f, lang) => {
//       const text = sourceFiles.get(f);
//       if (text === undefined) return undefined;
//       return ts.createSourceFile(f, text, lang);
//     },
//     writeFile: (name, text) => outputFiles.set(name, text),
//     getDefaultLibFileName: ts.getDefaultLibFilePath,
//     getCurrentDirectory: () => "",
//     getDirectories: () => [],
//     fileExists: (f) => sourceFiles.has(f),
//     readFile: (f) => sourceFiles.get(f),
//     getCanonicalFileName: (f) => f,
//     useCaseSensitiveFileNames: () => true,
//     getNewLine: () => "\n",
//   };

//   // Create program like tsc does
//   const program = ts.createProgram([fileName], compilerOptions, host);
//   program.emit();

//   // Find and return the generated .d.ts content
//   for (const [file, text] of outputFiles) {
//     if (file.endsWith(".d.ts")) {
//       return text;
//     }
//   }

//   throw new Error("No .d.ts output generated");
}

/**
 * Convert a TypeScript string into valid .d.ts content
 * @param code TS string with exports
 * @returns valid .d.ts string
 */
export function _generateTypes(code: string, file: string): string {
  const sourceFile = ts.createSourceFile(
    path.basename(file),
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  // For each statement, prepend `declare` if it is exported
  const transformedStatements: ts.Statement[] = [];

  sourceFile.statements.forEach((stmt) => {
    if (
      ts.isVariableStatement(stmt) ||
      ts.isFunctionDeclaration(stmt) ||
      ts.isClassDeclaration(stmt)
    ) {
      const modifiers = stmt.modifiers ? Array.from(stmt.modifiers) : [];

      // Check if it already has declare
      const hasDeclare = modifiers.some(
        (m) => m.kind === ts.SyntaxKind.DeclareKeyword
      );

      // If exported but not declare, add declare
      if (!hasDeclare) {
        modifiers.push(ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword));
      }

      let newStmt: ts.Statement;

      if (ts.isVariableStatement(stmt)) {
        newStmt = ts.factory.updateVariableStatement(
          stmt,
          modifiers,
          stmt.declarationList
        );
      } else if (ts.isFunctionDeclaration(stmt)) {
        newStmt = ts.factory.updateFunctionDeclaration(
          stmt,
          modifiers,
          stmt.asteriskToken,
          stmt.name,
          stmt.typeParameters,
          stmt.parameters,
          stmt.type,
          undefined // remove function body
        );
      } else if (ts.isClassDeclaration(stmt)) {
        newStmt = ts.factory.updateClassDeclaration(
          stmt,
          modifiers,
          stmt.name,
          stmt.typeParameters,
          stmt.heritageClauses,
          [] // remove members
        );
      } else {
        newStmt = stmt;
      }

      transformedStatements.push(newStmt);
    } else {
      transformedStatements.push(stmt);
    }
  });

  // Create a new source file and print
  const dtsSource = ts.factory.updateSourceFile(sourceFile, transformedStatements);
  return printer.printFile(dtsSource);
}


/**
 * Compile TypeScript code (string) into JavaScript (string)
 * @param tsCode TypeScript code as string
 * @param options Optional compiler options
 * @returns JavaScript code as string
 */
export function compileTsToJs(
  tsCode: string,
  options?: ts.CompilerOptions
): string {
  const defaultOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    strict: true,
    esModuleInterop: true,
  };

  const compilerOptions = { ...defaultOptions, ...options };

  // Transpile the TS code
  const output = ts.transpileModule(tsCode, {
    compilerOptions,
    reportDiagnostics: true,
  });

  if (output.diagnostics && output.diagnostics.length > 0) {
    output.diagnostics.forEach((diag) => {
      if (diag.messageText) {
        console.warn("TS Warning:", diag.messageText);
      }
    });
  }

  return output.outputText;
}

export const getPathMatcher = (file: string, options: {matcher: string, value: string})=>{
    const {matcher, value} = options
    const dts_path = file.replace(matcher, value).replace(/(\.ts|\.tsx)$/, '.d.ts')
    const js_path = file.replace(matcher, value).replace(/(\.ts|\.tsx)$/, '.js')
    return {dts_path, js_path}
}

export const compile = (code: string, file: string, replace: {matcher: string, value: string, compileTypes: boolean} = {matcher: 'src/', value: 'dist/src/', compileTypes: true})=>{
    const {dts_path, js_path} = getPathMatcher(file, replace)
    const {compileTypes} = replace
    // if(!file.includes('src/index.ts')){
    //     console.log({js_path, dts_path})
    // }
    const js = compileTsToJs(code)
    const types = compileTypes ? generateTypes(code, file) : ''
    return {js, types, dts_path, js_path}
}