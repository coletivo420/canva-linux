# Development

## Requirements

- Node.js >= 22
- npm
- Git
- Flatpak
- flatpak-builder
- desktop-file-utils
- appstreamcli

## Setup

```bash
git clone https://github.com/coletivo420/canva-linux.git
cd canva-linux
npm ci
```

## Run

```bash
npm start
./canva-linux.sh --install-flatpak
```

## Validate

```bash
./canva-linux.sh --validate
```

## Build

```bash
npm run build:runtime
npm run build:check
./canva-linux.sh --bundle-flatpak
```

## Patch checklist

- update code;
- update docs if behavior changes;
- update CHANGELOG for user-facing or architecture changes;
- run validation;
- do not commit generated build outputs.
- for TypeScript preload/runtime Promise constructors, prefer explicit generics (e.g. `new Promise<MyType>(...)`) whenever resolved values are consumed structurally.
