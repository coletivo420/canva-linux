# Dev11 ESM Migration Plan

## Current CommonJS debt

- package.json esbuild commands using `--format=cjs`
- tsconfig module/commonjs settings
- generated c420ui bootstrap `.cjs`
- `.build/scripts/*.js` generated as CommonJS
- `.build/electron/**/*.js` generated from CommonJS TypeScript config
- CommonJS assumptions around `__dirname` and `__filename`
- Node execution paths expecting `.js` CommonJS outputs

## Target

- package.json uses `"type": "module"` or isolated ESM package boundaries
- TypeScript uses `NodeNext` or equivalent ESM-compatible config
- build outputs use `.mjs` or ESM `.js` under a module package boundary
- c420ui bootstrap emits `.mjs`
- old `.cjs` bootstrap artifacts are removed, not preserved as permanent fallback
- repository checks reject new CommonJS source patterns
