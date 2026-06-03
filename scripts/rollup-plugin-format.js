// scripts/rollup-plugin-format.js
import { formatCode } from './format-code.js';

/**
 * Rollup plugin to format generated code
 * @param {Object} options - Formatting options
 * @returns {Object} Rollup plugin object
 */
export function formatPlugin(options = {}) {
  return {
    name: 'format',
    async generateBundle(outputOptions, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          try {
            // Determine parser based on file extension
            const parser = fileName.endsWith('.ts') ? 'typescript' : 'javascript';
            chunk.code = await formatCode(chunk.code, { 
              parser, 
              ...options 
            });
          } catch (error) {
            console.warn(`Failed to format ${fileName}:`, error.message);
          }
        }
      }
    }
  };
}
