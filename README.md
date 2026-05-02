# Canva Linux - Flatpak + Electron

A community opensource desktop wrapper for use with Canva.


## GitHub Pages

A GitHub Pages test page is available in [`docs/index.html`](docs/index.html).

To publish it:

1. Open **Settings** → **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/docs**.
4. Save.

Expected URL after GitHub finishes deployment:

```text
https://coletivo420.github.io/canva-linux/
```

## Status

Canva Linux is currently **alpha** software.

Active development line:

```text
0.1.4-dev.X
```

Canva Linux is a community-maintained open source package for use with Canva. It is not published, verified, endorsed, certified, or officially supported by Canva Pty Ltd. References to Canva describe the upstream web service this wrapper is built to access.

Historical development references from the previous 1.4.x line map to the alpha line and are kept in the changelog for traceability.

## Development (alpha line)

### 0.1.4-dev.X scope (TypeScript + CL-EyeDropper roadmap)

This phase adds TypeScript tooling without converting runtime modules to `.ts` yet:

- installs `typescript` and `@types/node` as dev dependencies
- introduces `tsconfig.json` with `allowJs + checkJs` to type-check existing JavaScript
- adds `npm run typecheck` (`tsc --noEmit`)
- extends `scripts/validate-project.sh` so type-checking becomes part of the standard validation pipeline


## Development requirements

Canva Linux development workflows require the following host tools.

### Required

- Node.js >= 22
- npm
- Git
- Bash
- Flatpak
- flatpak-builder

### Required for full validation

- desktop-file-validate
- appstreamcli
- curl
- sha256sum
- tar

### Check your environment

```bash
node -v
npm -v
git --version
bash --version
flatpak --version
flatpak-builder --version
```

Node.js must be version 22 or newer.

### openSUSE Tumbleweed

```bash
sudo zypper install \
  nodejs22 \
  npm \
  git \
  bash \
  flatpak \
  flatpak-builder \
  desktop-file-utils \
  appstream \
  curl \
  tar \
  coreutils
```

### Debian / Ubuntu

```bash
sudo apt install \
  nodejs \
  npm \
  git \
  bash \
  flatpak \
  flatpak-builder \
  desktop-file-utils \
  appstream \
  curl \
  tar \
  coreutils
```

If your distribution provides Node.js older than 22, install Node.js 22 or newer using your preferred method, such as NodeSource, fnm, asdf, nvm, or official Node.js binaries.

### Arch Linux

```bash
sudo pacman -Syu \
  nodejs \
  npm \
  git \
  bash \
  flatpak \
  flatpak-builder \
  desktop-file-utils \
  appstream \
  curl \
  tar \
  coreutils
```

### Fedora

```bash
sudo dnf install \
  nodejs \
  npm \
  git \
  bash \
  flatpak \
  flatpak-builder \
  desktop-file-utils \
  appstream \
  curl \
  tar \
  coreutils
```

For Fedora 44 or newer, you can alternatively install:

```bash
sudo dnf install nodejs22 npm
```

## Log System

- modularized `electron/main` and `electron/preload`
- centralized debug logging in the main process
- per-start `current.log` creation under the Electron user-data logs directory

## Custom Colorpicker Policy

Canva Linux must always use the bundled custom colorpicker based on `ltcodedev/eyedropper`:

https://github.com/ltcodedev/eyedropper

Project policy:

- the Canva color picking flow must resolve into the bundled `ltcodedev/eyedropper` implementation
- native browser/system color pickers are not the intended Canva Linux colorpicker path
- screen-capture, portal, or Chromium picker paths must not replace the bundled custom picker as the primary behavior
- Wayland and X11 support must preserve the same custom picker behavior

### Preload bundle note

The source preload stays modular under `electron/preload/*.js`, but the runtime tab preload is generated as `.build/electron/preload/canva.bundle.js` before `npm start`, `npm run dist`, and any Flatpak workflow path that rebuilds the Electron output. The legacy `npm run build:preload` command can still generate `electron/preload/canva.bundle.js` from source when needed.

During TypeScript migration, the source-mode preload bundler must resolve shared modules that have moved from `.js` to `.ts` and transpile them before embedding them in `canva.bundle.js`. Build-output mode continues to bundle the compiled `.build/electron/**/*.js` files.

This is required because Canva's editor can execute Electron preload code in a sandboxed context where nested local `require('./module')` calls fail inside the packaged ASAR. The generated bundle preserves maintainable source modules while delivering one preload file to Electron. Edit the modular source files and regenerate the bundle; do not edit or commit `canva.bundle.js` directly.

Release bundle generation rebuilds the Electron output and Flatpak repo by default so the generated preload bundle and packaged app stay current. Reusing an existing `repo/` requires an explicit `--use-existing-repo` call to `scripts/build-flatpak-bundle.sh` and should not be used for release publication after source changes.

## Runtime build

Development now builds the Electron runtime into `.build/electron/` before starting or packaging.

```bash
npm run build:runtime
npm start
```

The source remains in:

```text
electron/
```

Generated runtime files include:

```text
.build/electron/main/index.js
.build/electron/preload/canva.bundle.js
```

Do not edit generated files manually.

Project validation remains source-first: lint, typecheck, tests and docs checks run before the runtime build.

## AI and regression policy

This project treats `CHANGELOG.md` as protected project history.

Features and behaviors recorded there must not be removed, weakened, renamed, or bypassed by AI-assisted patches unless explicitly requested by the maintainer.

See:

- `docs/AI_GUARDRAILS.md`
- `docs/FEATURES.md`
- `docs/TYPESCRIPT_CONVERSION_REVIEW.md`

## OAuth Support

Google OAuth was tested and is considered stable.

Other providers (Facebook/Meta, Apple, Microsoft) are supported via the same generalized popup flow but are community-tested and may require user feedback.

## Flatpak Workflow (Canonical Command)

Use `./canva-linux.sh` as the canonical Linux workflow command.

```bash
./canva-linux.sh --run-dev
./canva-linux.sh --install
./canva-linux.sh --bundle
./canva-linux.sh --validate
./canva-linux.sh --uninstall
./canva-linux.sh --reset-user-data
./canva-linux.sh --help
```

### Interactive mode

Running without arguments opens an interactive menu:

```bash
./canva-linux.sh
```

### Chained actions

Actions can be chained and run in the order provided:

```bash
./canva-linux.sh --install --bundle
./canva-linux.sh --bundle --install
./canva-linux.sh --validate --bundle
./canva-linux.sh --reset-user-data --install
./canva-linux.sh --uninstall --reset-user-data
```

### Workflow intent

- `--run-dev` builds and runs from `build-dir` without installing the app or creating a local app origin.
- `--install` is for local development/testing installs.
- `--install` uses `flatpak-builder --install` direct install flow (no `repo/` export and no `.flatpak` bundle generation).
- `--bundle` is for generating GitHub release `.flatpak` artifacts.
- `--bundle` rebuilds the Electron output and Flatpak repo before creating the artifact.
- Flathub submission remains a separate process and should not require `.flatpak` bundle generation.
- Submission-specific assets live in `packaging/flathub/`; local workflows continue to use `io.github.PirateMaryRead.canva-linux.yml`.
- `--reset-user-data` removes login state and OAuth/session cookies.

### Flatpak installation scope policy

Canva Linux local workflows must not create a duplicate Flathub user remote by default.

Default policy:

- `./canva-linux.sh --install` uses the system Flatpak installation.
- The app is installed for all users on this machine.
- Required runtimes are installed from the system Flathub remote when missing.
- The user Flathub remote is never added unless explicitly requested.
- Administrator authorization may be requested for system Flatpak operations because system installs write under `/var/lib/flatpak`.
- Local system installs build as the current user, then install from the generated local repo URI with administrator authorization.
- Local Flatpak artifact ownership is restored to the current user after install, bundle and dev-run workflows.
- Developers who want a fully user-scoped install may run:

```bash
CANVA_FLATPAK_SCOPE=user ./canva-linux.sh --install
```

User-scoped installs are isolated under the current user's home directory and may duplicate Flathub remotes, runtimes, SDKs, BaseApps and the Canva Linux app if those already exist in the system Flatpak installation.

Do not switch the default back to `--user` only to avoid an administrator prompt.

Development smoke tests should prefer:

```bash
./canva-linux.sh --run-dev
```

because it builds and runs from `build-dir` without installing the app or creating local origin remotes.

Migration note: development builds before `1.4.10.dev19` used `com.canva.Linux`. The active Flathub-facing app-id is now `io.github.PirateMaryRead.canva-linux`.

```bash
flatpak uninstall com.canva.Linux
flatpak run io.github.PirateMaryRead.canva-linux
```

## Flathub Status

The project is approaching Flathub submission readiness, but final submission should happen only after maintainer review of lint results, permissions, screenshots, and release source.

Detailed packaging notes live in:

- `docs/FLATHUB.md`
- `docs/FLATHUB_CHECKLIST.md`
- `docs/FLATHUB_SOURCE.md`
- `docs/SCREENSHOTS.md`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/FLATHUB_SUBMISSION_PATH.md`
- `docs/FLATHUB_SUBMISSION_NOTES.md`
- `packaging/flathub/`

## Debugging

Canva Linux uses a single central log file:

```text
logs/current.log
```

Debug levels:

```bash
CANVA_DEBUG=1 flatpak run io.github.PirateMaryRead.canva-linux
CANVA_DEBUG=2 flatpak run io.github.PirateMaryRead.canva-linux
```

`CANVA_DEBUG=1` shows all internal Canva Linux diagnostics, including GPU acceleration monitoring.

`CANVA_DEBUG=2` shows all internal diagnostics plus verbose Chromium/Electron stderr logs.

Module-specific debug selection is not supported. See `docs/DEBUGGING.md`.

## GPU acceleration

Canva Linux enables GPU acceleration by default when DRI is available.

Available backends:

- `auto`
- `opengl`
- `vulkan`
- `software`
- `force`

See `docs/GPU_ACCELERATION.md`.

## Documentation

- `CHANGELOG.md` tracks released and development changes.
- `docs/TECHNICAL.md` contains repository technical notes.
- `docs/AI_DEVELOPMENT.md` documents AI-assisted maintenance conventions.
- `docs/DEVELOPMENT.md` documents phase scope and recommended execution order.
- `docs/TYPESCRIPT.md` documents TypeScript migration goals and rules for the `0.1.4-dev.X` line.
- `docs/CANVA_API.md` documents Canva API integration architecture planning notes.
- `docs/VALIDATION.md` defines baseline and close-out quality gate commands.
- `docs/PRIVACY.md` explains privacy and telemetry scope for this wrapper project.
- `docs/FLATHUB.md` covers Flathub submission preparation.
- `docs/FLATHUB_CHECKLIST.md` tracks practical Flathub submission checks.
- `docs/FLATHUB_SOURCE.md` documents the current local manifest source workflow and future Flathub source expectations.
- `docs/SCREENSHOTS.md` documents the screenshot workflow.
- `docs/FLATPAK_PERMISSIONS.md` documents Flatpak permissions and review notes.
- `docs/FLATHUB_SUBMISSION_PATH.md` documents the dedicated submission-path workflow and validation commands.
- `docs/FLATHUB_SUBMISSION_NOTES.md` captures submission rationale, including the response to thin-wrapper objections.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.

## AI-assisted development

This project includes guardrails to prevent regressions in logging, GPU acceleration, Flatpak behavior and Canva-specific features.

Before AI-assisted changes, read:

- `docs/AI_GUARDRAILS.md`
- `docs/LOGGING_CONTRACT.md`
- `docs/FEATURES.md`
- `docs/AI_DEVELOPMENT.md`

Logging changes must use safe argument normalization. The logger must never crash the Electron main process.
