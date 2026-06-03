import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Hash a file’s content for invalidation.
 */
function hashFile(filePath) {
  if (!existsSync(filePath)) return '';
  return crypto.createHash('sha1')
    .update(readFileSync(filePath))
    .digest('hex')
    .slice(0, 10);
}

/**
 * Hash any object or string.
 */
function hashObject(obj) {
  return crypto.createHash('sha1')
    .update(JSON.stringify(obj))
    .digest('hex')
    .slice(0, 10);
}

/**
 * Generate a consistent short ID for a path.
 */
function safeId(str) {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}

/**
 * Rollup persistent cache plugin (multi-entry + env-aware)
 */
export function persistentCachePlugin(options = {}) {
  const {
    dir = '.rollup-cache',        // cache directory
    configFile = 'rollup.config.js',
    packageFile = 'package.json',
    envKeys = ['NODE_ENV', 'ROLLUP_MODE'], // environment keys to hash
    silent = false,
  } = options;

  mkdirSync(dir, { recursive: true });

  // Compute base hashes
  const configHash = hashFile(path.resolve(configFile));
  const packageHash = hashFile(path.resolve(packageFile));

  // Compute environment hash (based on selected env vars)
  const envState = {};
  for (const key of envKeys) envState[key] = process.env[key] || null;
  const envHash = hashObject(envState);

  const metaInfo = { configHash, packageHash, envHash };
  const cacheMap = new Map();

  return {
    name: 'persistent-cache',

    /**
     * Try loading per-input cache when Rollup config resolves.
     */
    options(inputOptions) {
      const inputs = Array.isArray(inputOptions.input)
        ? inputOptions.input
        : typeof inputOptions.input === 'object'
        ? Object.values(inputOptions.input)
        : [inputOptions.input];

      const allCaches = [];

      for (const input of inputs) {
        const cacheFile = path.resolve(dir, `${safeId(input)}.json`);
        let cache = null;
        if (existsSync(cacheFile)) {
          try {
            const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
            const valid =
              data.meta?.configHash === metaInfo.configHash &&
              data.meta?.packageHash === metaInfo.packageHash &&
              data.meta?.envHash === metaInfo.envHash;

            if (valid) {
              cache = data.cache;
              if (!silent)
                console.log(`✅ Loaded cache for "${input}" [env=${process.env.NODE_ENV || 'unknown'}].`);
            } else if (!silent) {
              console.log(`♻️  Cache invalidated for "${input}" (config/deps/env changed).`);
            }
          } catch {
            if (!silent)
              console.warn(`⚠️  Corrupted cache ignored for "${input}".`);
          }
        }
        cacheMap.set(input, { cacheFile, cache });
        if (cache) allCaches.push(cache);
      }

      // If only one input, attach cache directly
      if (allCaches.length === 1) inputOptions.cache = allCaches[0];
      return inputOptions;
    },

    /**
     * Save per-input cache after build success.
     */
    buildEnd(error) {
      if (error) return;
      for (const [input, { cacheFile }] of cacheMap.entries()) {
        if (!this.cache) continue;
        try {
          const data = { meta: metaInfo, cache: this.cache };
          writeFileSync(cacheFile, JSON.stringify(data));
          if (!silent)
            console.log(`💾 Saved cache for "${input}" [env=${process.env.NODE_ENV || 'unknown'}].`);
        } catch (err) {
          console.warn(`⚠️  Failed to save cache for "${input}":`, err.message);
        }
      }
    },
  };
}