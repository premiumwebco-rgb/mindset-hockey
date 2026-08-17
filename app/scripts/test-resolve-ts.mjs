/**
 * Node ESM loader hook: lets `node --experimental-strip-types --test` resolve
 * the repo's normal extensionless relative TypeScript imports (e.g.
 * `from './rubric'`), which the plain Node loader otherwise rejects with
 * ERR_MODULE_NOT_FOUND since it requires a full specifier.
 *
 * This exists purely so `*.test.ts` files can import production modules
 * without those modules changing their import style for the test runner's
 * sake. No production code path loads this file.
 *
 * Usage:
 *   node --experimental-strip-types --import ./scripts/test-resolve-ts.mjs --test <files>
 */
import { register } from 'node:module';

register('./test-resolve-ts-hooks.mjs', import.meta.url);
