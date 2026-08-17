import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ==========================================================================
   FLAT CONFIG (ESLint 9)

   `next lint` is deprecated as of this Next.js version and, under ESLint 9,
   its own legacy-to-flat bridging is what was producing "Converting circular
   structure to JSON" when resolving the React plugin. Bypassing `next lint`
   and calling the ESLint CLI directly against a flat config removes that
   bridging entirely — this file uses the same FlatCompat shim Next.js's own
   `create-next-app` flat-config template uses to reuse `eslint-config-next`'s
   existing (non-flat) "next/core-web-vitals" / "next/typescript" configs
   without needing a flat-native rewrite of eslint-config-next itself.

   Same lint rules as the previous .eslintrc.json — this only changes how
   ESLint is invoked, not what it checks.
   ========================================================================== */

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
