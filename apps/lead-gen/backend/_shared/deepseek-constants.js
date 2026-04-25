// Mirror of src/lib/deepseek/constants.ts (DEEPSEEK_MODELS) in the parent
// Next.js app — keep these IDs in sync with that file.
//
// Imported by both backend/core/src/index.js and backend/research/src/index.js
// (CF Worker entrypoints). Wrangler bundles this via esbuild from each
// Worker's main, so the relative `../../_shared/...` import resolves at build
// time. Note: wrangler.jsonc files cannot import code (JSON config), so the
// same literals live duplicated there with a comment pointing to this file.
export const DEEPSEEK_PRO = "deepseek-v4-pro";
export const DEEPSEEK_FLASH = "deepseek-v4-flash";
