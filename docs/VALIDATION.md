# Validation

## Quick validation

```bash
./canva-linux.sh --validate
```

## Manual validation flow

- `build:preload` = esbuild source mode (`electron/preload/canva.ts` -> `electron/preload/canva.bundle.js`).
- `build:runtime` = `tsc` + runtime asset copy + esbuild build-output mode (`.build/electron/preload/canva.js` -> `.build/electron/preload/canva.bundle.js`).
- `build:check` = validation of final runtime artifacts.


```bash
rm -rf .build
npm test
test ! -d .build

npm run lint
npm run typecheck
npm run typecheck:strict
npm run docs:check-links
npm run docs:check-ai
./scripts/check-flatpak-scope-policy.sh
npm run build:preload
npm run build:runtime
npm run build:check
./scripts/validate-flatpak.sh
./scripts/validate-flathub-submission.sh
git diff --check
```

## Runtime smoke checks

```bash
npm start
CANVA_DEBUG=1 npm start
CANVA_DEBUG=2 npm start
./canva-linux.sh --install-flatpak
```

## Flatpak checks

```bash
desktop-file-validate data/io.github.coletivo420.canva-linux.desktop
appstreamcli validate --explain data/io.github.coletivo420.canva-linux.metainfo.xml
bash -n canva-linux.sh
bash -n run.sh
bash -n scripts/flatpak-build-common.sh
bash -n scripts/validate-flatpak.sh
```

## Feature smoke checklist

- app starts;
- Canva loads;
- session persists after restart;
- OAuth popup flow works;
- tabs open/switch/close;
- upload/import works;
- export/download works;
- CL-EyeDropper returns `{ sRGBHex: "#rrggbb" }`;
- Escape cancels EyeDropper;
- debug logs are written when `CANVA_DEBUG=1`;
- verbose Chromium logs appear when `CANVA_DEBUG=2`.

## Release-candidate readiness

Before creating an RC:

- validation command passes;
- Flatpak metadata validates;
- AppStream metadata validates;
- README is current;
- CHANGELOG has the release entry;
- GitHub Pages page is current;
- generated files are not committed.
