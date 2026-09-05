/**
 * The actual resolve hook, registered by test-resolve-ts.mjs via
 * node:module's register(). See that file for usage/rationale.
 */

// Project root — this file lives in scripts/, one level below the repo root
// that tsconfig.json's "@/*": ["./*"] path alias is relative to.
const PROJECT_ROOT = new URL('../', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  // Mirrors tsconfig.json's "@/*" -> "./*" path alias, which only Next.js's
  // own webpack/SWC resolution understands — plain Node ESM has no idea
  // '@/lib/plans' means anything. Production modules (e.g. lib/ai/quota.ts)
  // use this alias freely; rewriting it here to a real relative specifier
  // lets *.test.ts files import them under the Node test runner unchanged.
  if (specifier.startsWith('@/')) {
    const rewritten = new URL(specifier.slice(2), PROJECT_ROOT).href;
    for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
      try {
        return await nextResolve(rewritten + suffix, context);
      } catch {
        // try the next suffix
      }
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    if (isRelative && err && err.code === 'ERR_MODULE_NOT_FOUND') {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        try {
          return await nextResolve(specifier + suffix, context);
        } catch {
          // try the next suffix
        }
      }
    }
    throw err;
  }
}
