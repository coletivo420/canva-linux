# Development

## Requirements

- Node.js >= 22
- npm
- Git
- Flatpak
- flatpak-builder
- desktop-file-utils
- appstreamcli

Flatpak-related tools are required for Flatpak Install and `.flatpak` package generation. Native Install and AppImage packaging still require Node.js, npm, Git and the Electron build toolchain.

## Setup

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
npm ci --include=dev
```

## Doctor

```bash
./canva-linux.sh --doctor
```

## Run during development

```bash
npm start
CANVA_DEBUG=1 npm start
CANVA_DEBUG=2 npm start
```

## Build

All source-build workflows must bootstrap npm dependencies before invoking npm build scripts. Use the wrapper commands instead of calling `npm run build:runtime` directly.

```bash
./canva-linux.sh --build-runtime
npm run build:check
./canva-linux.sh --build-dir
```

Repair commands:

```bash
npm ci --include=dev
CANVA_NPM_REPAIR=clean ./canva-linux.sh --install-native
CANVA_SKIP_NPM_INSTALL=1 ./canva-linux.sh --install-native
```

## Install from source

### Native Install

```bash
./canva-linux.sh --install-native
```

Native Install uses system scope by default and runs outside the Flatpak sandbox.

For user scope:

```bash
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

### Flatpak Install

```bash
./canva-linux.sh --install-flatpak
```

For user scope:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install-flatpak
```

## Package generation

```bash
./canva-linux.sh --bundle-flatpak
./canva-linux.sh --bundle-appimage
```

AppImage packaging is experimental in this development line and runs outside the Flatpak sandbox.

Planned package targets:

- `.deb`
- `.rpm`
- AUR / PKGBUILD

## Validate

```bash
./canva-linux.sh --validate
```

## Maintenance

```bash
./canva-linux.sh --clean
./canva-linux.sh --uninstall
./canva-linux.sh --purge
```

## Patch checklist

- update code;
- update docs if behavior changes;
- update `CHANGELOG.md` for user-facing or architecture changes;
- run validation;
- do not commit generated build outputs.
- for TypeScript preload/runtime Promise constructors, prefer explicit generics (e.g. `new Promise<MyType>(...)`) whenever resolved values are consumed structurally.


## Versioning policy

Canva Linux may use project phase labels such as `0.1.4.11-dev.29`.

Package metadata consumed by npm, electron-builder and future Linux package targets must use valid SemVer: `0.1.4-dev.11.29`.

Do not use four numeric version segments in `package.json#version`.

Invalid: `0.1.4.11-dev.29`
Valid: `0.1.4-dev.11.29`
