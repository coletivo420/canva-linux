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

## Installer and package workflow checks

```bash
bash -n canva-linux.sh
bash -n scripts/app-identity-common.sh
bash -n scripts/xdg-common.sh
bash -n scripts/install-layout-common.sh
bash -n scripts/desktop-integration-common.sh
bash -n scripts/runtime-guidance-common.sh
bash -n scripts/user-data-common.sh
bash -n scripts/install-native.sh
bash -n scripts/native-install-common.sh
bash -n scripts/uninstall-native.sh
bash -n scripts/build-electron-dir.sh
bash -n scripts/build-appimage.sh
bash -n scripts/doctor.sh
bash -n scripts/clean-artifacts.sh
bash -n scripts/install-flatpak-local.sh
bash -n scripts/build-flatpak-bundle.sh

./canva-linux.sh --help
./canva-linux.sh --doctor
./canva-linux.sh --build-runtime
./canva-linux.sh --build-dir
```

## Runtime smoke checks

```bash
npm start
CANVA_DEBUG=1 npm start
CANVA_DEBUG=2 npm start
```

## Native Install checks

```bash
./canva-linux.sh --install-native
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
./canva-linux.sh --uninstall-native
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --uninstall-native
```

Native Install runs outside the Flatpak sandbox. User-data cleanup is XDG-aware and checks `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`, and `XDG_STATE_HOME` with standard fallbacks.

## Flatpak checks

```bash
desktop-file-validate data/io.github.coletivo420.canva-linux.desktop
appstreamcli validate --explain data/io.github.coletivo420.canva-linux.metainfo.xml
bash -n run.sh
bash -n scripts/flatpak-build-common.sh
bash -n scripts/validate-flatpak.sh
./canva-linux.sh --install-flatpak
./canva-linux.sh --bundle-flatpak
```

## AppImage checks

```bash
./canva-linux.sh --bundle-appimage
find dist -maxdepth 1 -type f -name '*.AppImage' -print
```

AppImage packaging is experimental in this development line. AppImage artifacts run outside the Flatpak sandbox and may require FUSE support depending on the distribution.

## AppImage FUSE host check

```bash
command -v fusermount3 || command -v fusermount || true
```

FUSE is not required to generate the AppImage artifact, but it may be required to run it on some systems.

See `docs/APPIMAGE_FUSE.md`.

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
- verbose Chromium/Electron logs appear when `CANVA_DEBUG=2`.

## Release-candidate readiness

Before creating an RC:

- validation command passes;
- Native Install validates in system and user scopes;
- Flatpak metadata validates;
- AppStream metadata validates;
- package artifacts are generated intentionally and not committed;
- README is current;
- CHANGELOG has the release entry;
- GitHub Pages page is current;
- generated files are not committed.


## Versioning policy

Canva Linux may use project phase labels such as `0.1.4.11-dev.29`.

Package metadata consumed by npm, electron-builder and future Linux package targets must use valid SemVer: `0.1.4-dev.11.29`.

Do not use four numeric version segments in `package.json#version`.

Invalid: `0.1.4.11-dev.29`
Valid: `0.1.4-dev.11.29`

bash -n scripts/ui-common.sh
bash -n scripts/install-detection-common.sh


Additional detection check:

```bash
./canva-linux.sh --bundle-appimage
./canva-linux.sh
# Maintenance & Uninstall -> Show detected installs/artifacts
```

UI fallback checks:

```bash
NO_COLOR=1 ./canva-linux.sh --help
TERM=dumb ./canva-linux.sh --help
./canva-linux.sh --help | cat
```


## AppImage hardening validation

```bash
./canva-linux.sh --bundle-appimage
./canva-linux.sh --validate-appimage
./canva-linux.sh --validate-appimage-extract
test -f dist/SHA256SUMS
(cd dist && sha256sum -c SHA256SUMS)
```

Expected:

- one AppImage artifact under `dist/`;
- executable bit set;
- non-empty file;
- SHA256SUMS validates;
- optional extraction check warns but does not fail unless explicitly configured later.
