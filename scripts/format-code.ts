// scripts/format-code.ts
import { format } from 'prettier';

export interface FormatOptions {
  parser?: 'typescript' | 'babel' | 'babel-ts' | 'espree' | 'meriyah';
  semi?: boolean;
  singleQuote?: boolean;
  tabWidth?: number;
  trailingComma?: 'es5' | 'none' | 'all';
  printWidth?: number;
  useTabs?: boolean;
}

const defaultOptions: FormatOptions = {
  parser: 'typescript',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  useTabs: false,
};

/**
 * Determine the correct Prettier parser based on file extension or content
 * @param fileName - The file name or path
 * @param content - The file content (optional)
 * @returns The appropriate Prettier parser name
 */
function getParser(fileName?: string, content?: string): 'typescript' | 'babel' | 'babel-ts' | 'espree' | 'meriyah' {
  if (fileName) {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'typescript';
    }
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return 'babel';
    }
  }
  
  if (content) {
    // Check for TypeScript-specific syntax
    if (content.includes('interface ') || content.includes('type ') || content.includes(': string') || content.includes(': number')) {
      return 'typescript';
    }
  }
  
  // Default to babel for JavaScript
  return 'babel';
}

/**
 * Format TypeScript or JavaScript code string using Prettier
 * @param code - The code string to format
 * @param options - Prettier formatting options
 * @param fileName - Optional file name to help determine parser
 * @returns Formatted code string
 */
export async function formatCode(
  code: string,
  options: Partial<FormatOptions> = {},
  fileName?: string
): Promise<string> {
  try {
    const mergedOptions = { 
      ...defaultOptions, 
      ...options,
      parser: options.parser || getParser(fileName, code)
    };
    return await format(code, mergedOptions);
  } catch (error) {
    console.warn('Failed to format code:', error);
    throw Error('Failed to format code:', error); // Return original code if formatting fails
  }
}

// /**
//  * Format code synchronously (fallback if async version fails)
//  * @param code - The code string to format
//  * @param options - Prettier formatting options
//  * @returns Formatted code string
//  */
// export function formatCodeSync(
//   code: string,
//   options: Partial<FormatOptions> = {}
// ): string {
//   try {
//     const mergedOptions = { ...defaultOptions, ...options };
//     return format(code, mergedOptions);
//   } catch (error) {
//     console.warn('Failed to format code synchronously:', error);
//     return code; // Return original code if formatting fails
//   }
// }

/**
 * Format and write code to file
 * @param filePath - Path where to write the formatted code
 * @param code - The code string to format and write
 * @param options - Prettier formatting options
 */
export async function formatAndWriteFile(
  filePath: string,
  code: string,
  options: Partial<FormatOptions> = {}
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const formattedCode = await formatCode(code, options, filePath);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, formattedCode, 'utf-8');
    console.log(`✅ Formatted and wrote: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to format and write ${filePath}:`, error);
    throw error;
  }
}
