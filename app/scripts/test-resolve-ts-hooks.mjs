/**
 * The actual resolve hook, registered by test-resolve-ts.mjs via
 * node:module's register(). See that file for usage/rationale.
 */
export async function resolve(specifier, context, nextResolve) {
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
