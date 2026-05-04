## [0.1.4.11-dev.30] - 2026-05-04

### Fixed

- Fixed AppImage menu execution failing when `scripts/build-appimage.sh` is not executable.
- Fixed duplicated `Maintenance` section in the interactive installer menu.
- Fixed AppImage post-build guidance so the generated artifact path is printed correctly.

### Changed

- Introduced shared installer helper architecture for app identity, XDG paths, install layouts, desktop integration, runtime guidance and user-data cleanup.
- Centralized XDG user-data cleanup instead of duplicating path functions across scripts.
- Centralized runtime debug guidance for Native Install, Flatpak Install and AppImage.
- Reworked `canva-linux.sh` into a thin workflow router over shared installer helpers.

### Notes

- Runtime Electron behavior is unchanged.
- Native Install remains outside the Flatpak sandbox.
- AppImage remains experimental.
- `.deb`, `.rpm`, and AUR remain planned.

# Changelog

## [0.1.4.11-dev.29] - 2026-05-04

### Fixed

- Fixed Native Install failure caused by the invalid non-SemVer package version `0.1.4.11-dev.28`.
- Changed package metadata versioning to a SemVer-compatible format for npm and electron-builder.
- Added SemVer validation before Electron package builds to prevent late electron-builder failures.
- Fixed the package workflow so Native Install, Electron dir builds and AppImage builds fail early with actionable version errors.

### Changed

- Documented the distinction between project phase labels and package SemVer versions.
- Standardized the current package SemVer format as `0.1.4-dev.11.29` for the `0.1.4.11-dev.29` project phase.

### Notes

- Project planning may still refer to the phase as `0.1.4.11-dev.29`.
- `package.json#version` must remain valid SemVer.
- Runtime behavior is unchanged.

## [0.1.4.11-dev.28] - 2026-05-04

### Removed

- Removed the public Flatpak development run workflow from `canva-linux.sh`.
- Removed `--run-flatpak-dev` and the legacy `--run-dev` compatibility alias.
- Removed the obsolete Flatpak development run path from documentation.

### Changed

- Standardized installer, scripts, README and docs terminology in English.
- Rebuilt the `canva-linux.sh` help output around Native Install, Flatpak Install, package generation, build, validation, maintenance and uninstall workflows.
- Updated Native Install post-install guidance with run, debug, Wayland/X11 and GPU backend commands.
- Updated Flatpak Install post-install guidance to use the new package workflow commands.
- Updated README and installation documentation to remove the old Flatpak-dev-run workflow.
- Improved uninstall detection for Native and Flatpak installations.
- Improved generated artifact cleanup for root-owned build artifacts.

### Notes

- Runtime behavior is unchanged.
- Native Install remains available in system and user scopes.
- Flatpak Install remains available in system and user scopes.
- Native Install runs outside the Flatpak sandbox.
- Flatpak Install runs inside the Flatpak sandbox.
- AppImage packaging is experimental in this development phase.
- `.deb`, `.rpm`, and AUR packaging remain planned but not implemented in this phase.

## [0.1.4.11-dev.27] - 2026-05-04

### Added

- Added Native Install support through `./canva-linux.sh --install-native`.
- Added `CANVA_NATIVE_SCOPE=system|user`, with system scope as the default.
- Added system-scope Native Install under `/opt/canva-linux`.
- Added user-scope Native Install under `~/.local/opt/canva-linux`.
- Added native desktop integration for system and user scopes.
- Added explicit Flatpak commands: `--install-flatpak` and `--bundle-flatpak`.
- Added `--build-runtime` and `--build-dir` workflow commands.
- Added `--doctor` for host tooling checks.
- Added `--clean` for generated build/package artifact cleanup.
- Added installation detection for Native and Flatpak installs.
- Added explicit uninstall commands for Native and Flatpak installs.
- Added `--purge` to uninstall and remove user data.
- Added roadmap placeholders for future AppImage, `.deb`, `.rpm`, and AUR/PKGBUILD packaging.

### Notes

- Runtime behavior is unchanged.
- Native Install runs outside the Flatpak sandbox.
- Flatpak behavior is unchanged.

## [0.1.4.11-dev.26] - 2026-05-04

### Changed

- Consolidated the esbuild-based preload bundle pipeline introduced in `0.1.4.11-dev.25`.
- Cleaned up remaining preload TypeScript checking directive leftovers.
- Improved minimal typing around the custom CL-EyeDropper preload flow without changing runtime behavior.
- Clarified TypeScript documentation for the current `tsc` + esbuild build model.
- Updated technical documentation to reflect the current TypeScript source layout.

### Fixed

- Fixed version metadata drift after the esbuild preload migration.
- Removed contradictory `@ts-nocheck` / `@ts-check` usage from `electron/preload/custom-eyedropper-flow.ts`.

### Notes

- Runtime behavior is unchanged.
- esbuild remains limited to preload bundling.
- Electron main runtime is still compiled by `tsc`.
- The preload bundle output remains CommonJS.
- Scripts and tests remain JavaScript in this phase.

## [0.1.4.11-dev.25] - 2026-05-02

### Changed

- Replaced the manual preload bundler with esbuild.
- Kept the preload bundle output as CommonJS for Electron compatibility.
- Preserved source-mode and build-output-mode preload bundle generation.
- Kept `electron` external in the preload bundle.
- Updated build documentation for the new esbuild-based preload pipeline.

### Notes

- Runtime behavior is unchanged.
- Electron main runtime is still compiled by TypeScript through `tsc`.
- Flatpak, AppID, OAuth, tabs, GPU and CL-EyeDropper behavior are unchanged.

## [0.1.4-dev.24] - 2026-05-02

### Changed

- Reorganized active documentation around the current project state instead of historical development phases.
- Rewrote validation documentation to focus on the current validation flow.
- Simplified AI maintenance notes by removing obsolete phase-specific guardrails.
- Simplified runtime build checks by removing obsolete legacy-name token checks.
- Added a documentation index for easier navigation.
- Updated EyeDropper documentation to describe the current CL-EyeDropper-only architecture.
- Updated TypeScript documentation to describe the current migration state and active commands.

### Removed

- Removed obsolete DEV-phase guardrail sections from active maintenance documentation.
- Removed obsolete legacy EyeDropper token checks from runtime build validation.
- Removed stale historical validation sections from the active validation guide.

### Notes

- Runtime behavior is unchanged.
- CL-EyeDropper remains the only supported EyeDropper implementation.
- Historical details remain in `CHANGELOG.md`.

## [0.1.4-dev.23] - 2026-05-02

### Removed

- Removed the legacy LTCode-backed EyeDropper implementation.
- Removed the temporary EyeDropper implementation selector.
- Removed `CANVA_EYEDROPPER_IMPL` and renderer argument based picker selection.
- Removed `legacy` and `ltcode` EyeDropper modes.
- Removed selector-specific tests and runtime build checks.

### Changed

- Simplified the custom EyeDropper flow to use CL-EyeDropper directly.
- Simplified tab WebContentsView creation by removing EyeDropper implementation arguments.
- Updated documentation and guardrails to define CL-EyeDropper as the only supported implementation.
- Improved the README feature overview, including clearer documentation for persistent sessions and desktop secret storage integration.

### Notes

- CL-EyeDropper is now the only Canva Linux EyeDropper implementation.
- The result contract remains `{ sRGBHex: "#rrggbb" }`.
- Flatpak, AppID, OAuth, tabs, GPU and upload behavior are unchanged.

## [0.1.4-dev.22] - 2026-05-02

### Changed

- Migrated the canonical repository identity to `coletivo420/canva-linux`.
- Migrated the active Flatpak/AppStream/Electron AppID to `io.github.coletivo420.canva-linux`.
- Updated package metadata, Flatpak manifests, desktop entry, AppStream metadata, launcher scripts and documentation for the new repository identity.
- Removed redundant legacy-name guardrails from the Flatpak validation helpers.
- Updated GitHub Pages references to `https://coletivo420.github.io/canva-linux/`.
- Replaced the placeholder GitHub Pages test file with a real Canva Linux landing page.
- Added explicit migration notes for legacy AppIDs.

### Notes

- Runtime behavior is unchanged except for repository identity and AppID metadata.
- Legacy IDs are kept only as migration history, AppStream replacement metadata, or optional local cleanup targets.
- LTCode fallback removal is deferred to `0.1.4-dev.23`.

## [0.1.4-dev.21] - 2026-05-02

### Changed

- Made CL-EyeDropper the default Canva Linux EyeDropper implementation.
- Kept the LTCode-backed picker as a temporary fallback.
- Added `CANVA_EYEDROPPER_IMPL=legacy` to force the legacy LTCode path for diagnostics.
- Passed the selected EyeDropper implementation from the main process to the Canva preload via renderer arguments.
- Added implementation-selection tests for `cl` and `legacy` picker modes.

### Notes

- Default behavior now uses CL-EyeDropper.
- LTCode remains available as a temporary fallback.
- LTCode removal is deferred until post-validation cleanup.
- Flatpak, OAuth, tabs, GPU and upload behavior are unchanged.

## [0.1.4-dev.20] - 2026-05-02

### Added

- Added CL-EyeDropper as a TypeScript parity implementation of the current LTCode-backed picker.
- Added CL-EyeDropper exports for `CLEyeDropper`, `installClEyeDropperScalingPatch`, and `removeClEyeDropperUi`.
- Added parity tests for CL-EyeDropper behavior.
- Expanded runtime build checks for the compiled CL-EyeDropper module.

### Changed

- Updated CanvaLinux EyeDropper documentation to define DEV20 as a parity-first TypeScript conversion phase.

### Notes

- Runtime behavior is intentionally unchanged.
- The active Canva EyeDropper flow still uses the LTCode-backed implementation.
- CL-EyeDropper is not enabled by default in DEV20.
- Functional improvements are deferred until after parity validation.

## [0.1.4-dev.19] - 2026-05-01

### Added

- Added initial CL-EyeDropper TypeScript contract modules under `electron/preload/cl-eyedropper/`.
- Added validation and documentation for the preload TypeScript conversion phase.

### Changed

- Converted preload source modules to TypeScript while preserving the generated `canva.bundle.js` runtime path.
- Kept preload bundle module IDs stable as `.js` while allowing `.ts` source modules.
- Updated the CanvaLinux EyeDropper roadmap after the DEV18 main-entrypoint conversion.

### Notes

- Runtime behavior is intentionally unchanged.
- The active EyeDropper implementation still uses the LTCode-backed flow.
- CL-EyeDropper contracts are introduced, but the first-party picker is not implemented in DEV19.
- `CANVA_EYEDROPPER_IMPL` is not introduced yet.

## [0.1.4-dev.18] - 2026-05-01

### Changed

- Converted the main Electron entrypoint from `electron/main/index.js` to `electron/main/index.ts`.
- Completed the TypeScript conversion of `electron/main` while preserving CommonJS runtime behavior.
- Kept preload conversion deferred to DEV19.
- Kept CL-EyeDropper contracts and implementation deferred to later phases.

### Fixed

- Preserved app startup, lifecycle registration, session setup, tab controller wiring, OAuth popup wiring, GPU diagnostics registration and EyeDropper bridge registration during entrypoint conversion.
- Preserved runtime version detection through `app.getVersion()`.
- Updated direct build and lint dependencies to their latest available versions and adapted the packaging configuration for `electron-builder` 26.
- Added dependency freshness guardrails to prevent downgrades and require code/config adaptation for dependency upgrades.

### Notes

- Runtime behavior is intentionally unchanged.
- Preload modules remain JavaScript until DEV19.
- CL-EyeDropper is planned but not implemented in DEV18.
- Flatpak system/user scope behavior is unchanged.

## [0.1.4-dev.17] - 2026-05-01

### Changed

- Realigned Canva Linux versioning to the official alpha series.
- Replaced the previous `1.4.x` development line with the `0.1.x` alpha line.
- Updated documentation, roadmap, validation notes and metadata references to use alpha versioning.
- Shifted the TypeScript roadmap so `electron/main/index.js` conversion moves to DEV18.

### Notes

- Canva Linux is officially in alpha.
- The previous `1.4.x` references are historical development-line references.
- The active development line is now `0.1.4-dev.X`.
- Runtime behavior is intentionally unchanged.

All notable changes to this project are documented in this file.

## [0.1.4-dev.16] - 2026-05-01

> Historical mapping: `0.1.4-dev.16` -> `0.1.4-dev.16`.

### Changed

- Converted shell, tabs, OAuth and window-open policy main-process modules to TypeScript.
- Expanded runtime build checks for DEV15 and DEV16 converted modules.
- Preserved CommonJS runtime exports during the TypeScript migration.

### Fixed

- Preserved OAuth popup navigation and callback handling during TypeScript conversion.
- Preserved toolbar and tab-state broadcasting during TypeScript conversion.
- Preserved unsafe external URL blocking after conversion.
- Preserved current LTCode EyeDropper flow and scoped snapshot/reinjection behavior.

### Notes

- `electron/main/index.js` remains JavaScript until DEV18.
- Preload modules remain JavaScript until DEV19.
- CL-EyeDropper is planned but not implemented in DEV16.
- Flatpak system/user scope behavior is unchanged.

## [0.1.4-dev.15] - 2026-05-01

### Added

- Added `docs/CANVA_LINUX_EYEDROPPER.md` to document the planned first-party CL-EyeDropper architecture.

### Changed

- Bumped the development version to `0.1.4-dev.15`.
- Converted main-process infrastructure modules to TypeScript: logging, logging helpers, GPU diagnostics, runtime setup, IPC routing, lifecycle wiring and the EyeDropper snapshot bridge.
- Updated runtime build checks to require compiled output for `electron/shared/navigation.ts`.
- Updated the TypeScript roadmap from DEV15 onward to reflect the stabilized DEV14 and the staged CL-EyeDropper plan.

### Notes

- Logging, GPU backend behavior, IPC channel names and EyeDropper snapshot scoping are intended to remain unchanged.
- Shell, tabs, OAuth, window-open policy, the main entrypoint and preload modules remain out of scope for DEV15.

## [0.1.4-dev.14] - 2026-05-01

### Fixed

- Fixed broad TypeScript validation so `npm run typecheck` includes converted `.ts` runtime modules.
- Fixed runtime module tests so `npm test` no longer triggers `scripts/build-runtime.js` or writes `.build/`.
- Fixed local uninstall cleanup for local Flatpak remotes created by development install flows.

### Changed

- Bumped the development version to `0.1.4-dev.14`.
- Stabilized the DOC13 TypeScript leaf conversion test strategy before expanding conversion to larger runtime modules.
- Converted `electron/shared/navigation.ts` as the next small shared TypeScript boundary after test/build stabilization.
- Kept converted runtime `.ts` modules on CommonJS exports during the migration.
- Clarified that Flatpak artifact ownership restoration after install, bundle and dev-run workflows is protected behavior.
- Documented Google One Tap / FedCM console warnings as upstream Canva/Google Identity Services warnings.
- Classified known FedCM console warnings from `static.canva.com` as upstream warnings while preserving the original console log.

### Notes

- System-scope installation remains the default.
- User-scope installation remains available with `CANVA_FLATPAK_SCOPE=user`.
- `flatpak-builder` must continue running as the current user, never with `sudo`.
- Do not monkeypatch Google Identity Services APIs to silence FedCM warnings.

## [0.1.4-dev.13] - 2026-04-30

### Added

- Began the DOC13 TypeScript conversion phase with low-risk shared/logging leaf modules.
- Added validation guidance for converted `.ts` runtime modules.
- Added stronger documentation around Flatpak artifact ownership restoration.

### Changed

- Updated development documentation from older dev2/dev12 wording to the dev13 workflow.
- Added TypeScript-aware ESLint parsing for converted runtime `.ts` files.
- Clarified that system-scope Flatpak operations may request administrator authorization before or during build dependency preparation.
- Simplified remote permission trusted-origin checks so OAuth provider origins do not affect permission grants once Canva origin trust is required.

### Fixed

- Removed unconditional preload raw-init console logging outside `CANVA_DEBUG`.
- Restricted powerful runtime permissions to Canva origins instead of OAuth provider origins.
- Preserved Flatpak build artifact ownership restoration after install, bundle and dev-run workflows.
- Fixed source-mode `npm run build:preload` after `electron/shared/debug.ts` conversion by resolving TypeScript source candidates and transpiling them before bundling.
- Fixed local system installs failing to fetch `summary.idx` from the generated local Flatpak repo by configuring the local remote with a valid `file://` URI.

### Notes

- System-scope installation remains the default.
- User-scope installation remains available with `CANVA_FLATPAK_SCOPE=user`.
- Password prompts are expected for legitimate system Flatpak operations.
- `flatpak-builder` must continue running as the current user, never with `sudo`.
- The preload bundler must keep supporting both source mode (`npm run build:preload`) and build-output mode (`npm run build:runtime`) while TypeScript conversion is in progress.

## [0.1.4-dev.12-hotfix] - 2026-04-30

### Fixed

- Fixed Flatpak Builder permission errors caused by running `flatpak-builder` with administrator privileges in system scope.
- Fixed root-owned `.flatpak-builder`, `build-dir` and `repo` artifacts blocking subsequent local builds.
- Deferred administrator authorization to system Flatpak operations instead of the Flatpak build step.
- Fixed local system installs failing with `ConfigureRemote not allowed for user` by installing from the generated local repo with `sudo flatpak`.
- Fixed packaged startup failing when the compiled Electron main process tried to load `../../package.json` from inside `.build/`.
- Fixed default-scope bundle and dev-run workflows by ensuring system Flatpak runtimes are installed before unprivileged `flatpak-builder` runs.
- Fixed local Flatpak artifact ownership after install, bundle and dev-run workflows.
- Fixed local system installs failing to fetch `summary.idx` from the generated local Flatpak repo by configuring the local remote with a valid `file://` URI.

### Changed

- Local Flatpak builds now run `flatpak-builder` as the current user.
- System-scope local installs now request administrator authorization before the Flatpak system install step.
- Local system installs now configure the generated repo remote with a `file://` URI derived from the absolute repo path.
- Local Flatpak workflows now restore `build-dir`, `repo` and `.flatpak-builder` ownership before exiting.
- The installer now explains the difference between system and user Flatpak scopes before installation.
- The installer now documents the user-scope install command for passwordless per-user installs.
- Flatpak scope validation now rejects `sudo flatpak-builder`.

### Notes

- System-scope installation remains the default.
- User-scope installation remains available with `CANVA_FLATPAK_SCOPE=user`.
- User-scope installs may duplicate Flathub remotes, runtimes, SDKs, BaseApps and apps already installed in system scope.

## [0.1.4-dev.12] - 2026-04-30

### Added

- Added `tsconfig.build.json` for emitted Electron runtime builds.
- Added `.build/electron/` as the compiled runtime output directory.
- Added `scripts/build-runtime.js`.
- Added `scripts/clean-runtime-build.js`.
- Added `scripts/copy-runtime-assets.js`.
- Added `scripts/check-runtime-build.js`.
- Added `npm run clean:runtime`.
- Added `npm run build:runtime`.
- Added `npm run build:check`.

### Changed

- `npm start` now builds the Electron runtime before launching.
- `npm run dist` now builds the Electron runtime before packaging.
- Electron runtime now starts from `.build/electron/main/index.js`.
- Electron Builder now packages `.build/electron/**/*` instead of raw `electron/**/*`.
- Preload bundle generation now supports build-output mode for `.build/electron/preload/canva.bundle.js`.
- Project validation now keeps source checks first and runs runtime build validation after lint, typecheck, tests, docs and AI guardrails.
- Flatpak build artifact cleanup now handles root-owned `build-dir`/`repo` created by system-scope Flatpak builds.

### Notes

- Runtime behavior is intentionally unchanged.
- No source files are converted to `.ts` in this phase.
- `.build/` is generated and must not be committed.
- The source of truth remains `electron/`.
- This phase prepares DEV13+ for real `.ts` conversion.

## [0.1.4-dev.11] - 2026-04-30

### Added

- Added strict JSDoc typing for the main Electron orchestration entrypoint.
- Added `electron/main/index.js` to the strict TypeScript boundary.
- Added typed main-process orchestration state documentation.
- Added configurable Flatpak install scope through `CANVA_FLATPAK_SCOPE=system|user`.
- Added `./canva-linux.sh --run-dev` to build and run from `build-dir` without installing the app.
- Added Flatpak scope validation to prevent unconditional user-scoped Flathub installs.

### Changed

- Removed `// @ts-nocheck` from `electron/main/index.js`.
- Changed local Flatpak install policy to use system scope by default.
- Local install no longer creates a user Flathub remote by default.
- Local uninstall now removes Canva Linux from both user and system Flatpak scopes when present.
- Updated TypeScript migration documentation for the DEV11 orchestration typing phase.
- Updated Flatpak workflow documentation to clarify system/user scope policy.

### Notes

- Runtime behavior is intentionally unchanged.
- No `.ts` runtime conversion is performed in this phase.
- The Electron runtime still executes CommonJS JavaScript directly.
- `CANVA_FLATPAK_SCOPE=user` remains available for explicit user-scoped installs.
- The next TypeScript phase is the DEV12 build pipeline.

## [0.1.4-dev.10] - 2026-04-30

### Added

- Added changelog-backed non-regression rules for AI-assisted development.
- Added strict JSDoc typing coverage for remaining extracted main-process modules.
- Added targeted tests for runtime, logging helpers, tab state and EyeDropper bridge helpers.
- Added TypeScript conversion review documentation.
- Added full TypeScript conversion roadmap through post-conversion cleanup.

### Changed

- Expanded `tsconfig.strict.json` beyond logging, GPU, shell, OAuth, navigation and preload modules to cover the remaining extracted main-process modules.
- Expanded AI guardrails to treat `CHANGELOG.md` as protected project history.
- Updated TypeScript migration documentation with DEV10 through DEV22 progression.
- Clarified that cleanup must happen after full TypeScript conversion, not before it.

### Notes

- Runtime behavior is intentionally unchanged.
- No `.ts` runtime conversion is performed in this phase.
- `electron/main/index.js` remains the orchestration entrypoint and is deferred to DEV11 strict typing.

## [0.1.4-dev.9] - 2026-04-30

### Added

- Added strict JSDoc typing for preload debug routing.
- Added strict JSDoc typing for upload diagnostics helpers.
- Added strict JSDoc typing for EyeDropper routing diagnostics.
- Added strict JSDoc typing for custom EyeDropper flow helpers.
- Added strict JSDoc typing for native EyeDropper wrapper helpers.
- Added unit tests for preload debug helpers, upload diagnostics helpers and EyeDropper preload helpers.
- Added colorized post-install command guidance for interactive terminals.

### Changed

- Expanded `tsconfig.strict.json` to include selected preload integration modules.
- Improved post-install command readability with highlighted sections and commands.
- Post-install colors are disabled automatically for non-TTY output, `TERM=dumb`, or `NO_COLOR`.
- Documented `electron/preload/ltcode-eyedropper.js` as a library-like module reserved for DEV11 review.
- Preserved `electron/preload/canva.js` as the preload orchestration entrypoint without forcing full strict typing in this phase.

### Notes

- Runtime behavior is intentionally unchanged.
- `electron/preload/canva.bundle.js` remains generated by `npm run build:preload`.
- Public debug behavior remains level-based only: `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.

## [0.1.4-dev.8] - 2026-04-29

### Added

- Added strict JSDoc typing for shared navigation classification.
- Added strict JSDoc typing for main-process window-open policy.
- Added strict JSDoc typing for shell/window helper boundaries.
- Added strict JSDoc typing for OAuth popup boundary helpers.
- Added tests for shared navigation classification.
- Added tests for OAuth popup initial state helpers.

### Changed

- Expanded `tsconfig.strict.json` to include shell, navigation, window-open policy and OAuth boundary modules.
- OAuth diagnostics now pass popup options and bounds objects through the central safe logger instead of manually stringifying them.
- Updated TypeScript migration docs for the DEV8 boundary and DEV11 cleanup phase.

### Notes

- Runtime behavior is intentionally unchanged.
- OAuth popups remain separate from normal Canva tabs.
- Public debug behavior remains level-based only: `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.

## [0.1.4-dev.7] - 2026-04-29

### Added

- Added strict JSDoc typing for GPU diagnostics.
- Added GPU diagnostics to the strict TypeScript boundary.
- Added tests for GPU acceleration classification, runtime environment parsing, and feature status serialization.

### Changed

- GPU diagnostics now pass raw GPU info objects through the central safe logger instead of manually stringifying them.
- Updated TypeScript migration documentation with DEV7 scope and DEV11 cleanup/review phase.

### Notes

- Runtime behavior is intentionally unchanged.
- GPU acceleration remains controlled by the existing `CANVA_GPU_BACKEND` modes.
- Public debug behavior remains level-based only: `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.

## [0.1.4-dev.6] - 2026-04-29

### Added

- Added `tsconfig.strict.json` for the first strict TypeScript boundary.
- Added `npm run typecheck:strict`.
- Added strict JSDoc typing for logging normalization and debug-level helpers.
- Added debug-level tests covering `CANVA_DEBUG=1`, `CANVA_DEBUG=2`, and unsupported module-specific debug values.

### Changed

- Project validation now runs both broad JavaScript type checking and the strict TypeScript boundary check.
- Updated TypeScript migration documentation for the `0.1.4-dev.6+` sequence.

### Notes

- This phase does not convert the Electron runtime to `.ts`.
- Runtime behavior is intentionally unchanged.
- The public debug contract remains level-based only: `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.

## [0.1.4-dev.5] - 2026-04-28

### Added

- Added crash-safe logger argument normalization.
- Added safe handling for circular objects, BigInt, Error, Function, Symbol, null and undefined log arguments.
- Added tests for logger argument normalization.
- Added `docs/AI_GUARDRAILS.md`.
- Added `docs/LOGGING_CONTRACT.md`.
- Added `docs/FEATURES.md`.
- Added `scripts/check-ai-guardrails.js`.
- Added `npm run docs:check-ai`.

### Changed

- Logging now normalizes arguments one by one instead of serializing the full args array.
- Expanded AI development instructions to protect logging, GPU acceleration and Canva-specific features.
- Project validation now checks AI guardrail documentation.

## [0.1.4-dev.4] - 2026-04-28

### Fixed

- Fixed remote `package.json` syntax by restoring valid JSON for the `lint:fix` script.
- Added JSON preflight validation before reading package metadata from shell scripts.
- Fixed GPU diagnostics wording to use `central-log-file` because diagnostics remain centralized in `logs/current.log`.
- Migrated Electron `console-message` handlers away from deprecated legacy arguments.

### Changed

- Simplified debug behavior to two levels only.
- `CANVA_DEBUG=1` now shows all internal Canva Linux diagnostics, including GPU acceleration monitoring.
- `CANVA_DEBUG=2` now shows all internal diagnostics plus verbose Chromium/Electron stderr logs.
- Removed module-specific debug selection from command-line behavior.
- Removed category-specific debug commands from post-install output and documentation as supported runtime modes.
- Switched local dependency installation to `npm ci` when `package-lock.json` is available.
- Made `CANVA_GPU_BACKEND=auto` less aggressive by no longer forcing ANGLE/OpenGL.
- Added runtime GPU acceleration classification such as `accelerated-non-vulkan`, `accelerated-vulkan`, or `software-or-disabled`.

### Documentation

- Added or rewrote `docs/DEBUGGING.md`.
- Updated README debug-level documentation.
- Updated GPU acceleration docs for the single-log `current.log` model.
- Updated validation docs for `CANVA_DEBUG=1` and `CANVA_DEBUG=2`.

## [0.1.4-dev.3] - 2026-04-28

### Fixed
- Fixed invalid `package.json` caused by a broken `lint:fix` script string.
- Removed unconditional Linux hardware acceleration disablement from Electron runtime.

### Added
- Added `CANVA_GPU_BACKEND=auto|opengl|vulkan|software|force`.
- Added GPU vendor detection in `run.sh`.
- Added DRI render node detection and software fallback.
- Added OpenGL/ANGLE accelerated mode.
- Added experimental Vulkan/ANGLE mode.
- Added dedicated GPU diagnostics category.
- Added centralized GPU diagnostics logging in `logs/current.log`.
- Added Electron GPU feature status logging through `gpu-info-update`.
- Added GPU child-process crash/gone diagnostics.

### Changed
- Linux now prefers hardware acceleration when available.
- GPU diagnostics use the existing Canva Linux central logger.
- GPU state is logged through `CANVA_DEBUG=gpu`.

### Documentation
- Added `docs/GPU_ACCELERATION.md`.
- Updated README GPU acceleration section.
- Updated validation docs with GPU backend and log checks.

## [0.1.4-dev.2] - 2026-04-28

### Fixed
- Fixed local install failure when Node.js is missing by moving dependency checks before package metadata reads.
- Fixed bundle generation preflight order before reading package metadata with Node.js.
- Aligned `./canva-linux.sh --validate` with the full project validation workflow.
- Improved preflight messages for missing host tools.

### Changed
- Added shared script preflight helpers.
- Documented development requirements in README and technical docs.
- Added distribution-specific setup commands for openSUSE, Debian/Ubuntu, Arch Linux, and Fedora.
- Clarified that Node.js >=22 is required for development workflows.

### Documentation
- Updated README.md requirements.
- Updated docs/DEVELOPMENT.md.
- Updated docs/VALIDATION.md.
- Updated docs/FLATHUB_SUBMISSION_PATH.md.
- Updated docs/AI_DEVELOPMENT.md.
- Added docs/TROUBLESHOOTING.md.

## [0.1.4-dev.1] - 2026-04-26

### Added
- Added TypeScript foundation tooling for the `0.1.4-dev.X` cycle with `typescript`, `@types/node`, and `tsconfig.json` configured to type-check existing JavaScript (`allowJs` + `checkJs`) without emitting build artifacts.
- Added npm script `typecheck` (`tsc --noEmit`) for local and CI-safe static type validation.
- Added `docs/TYPESCRIPT.md` to define migration scope, sequencing, and guardrails for future `dev2+` phases.
- Added `docs/CANVA_API.md` with initial architecture notes comparing Canva Apps SDK and Canva Connect API usage in this desktop wrapper.

### Changed
- Updated `scripts/validate-project.sh` to include preload build, lint, typecheck, tests, docs link checks, Flatpak checks, Flathub-submission checks, and `git diff --check`.
- Updated `README.md` status documentation for `0.1.4-dev.1`, including the TypeScript foundation scope and new docs references.

## [1.4.10] - 2026-04-26

### Added
- Consolidated release closure documentation for the stable `1.4.10` launch, including release checklist and manual validation guidance for the final JavaScript cycle.

### Changed
- Promoted package versioning from `1.4.10-dev.20` through `1.4.10-rc.1` to stable `1.4.10`.
- Confirmed release validation workflow for preload bundle generation, lint/tests, Flatpak validation scripts, and Flathub-submission preparatory checks.
- Updated README release status to mark `1.4.10` as stable and `0.1.4-dev.1` as the next planned development line (TypeScript + Canva API).

### Notes
- This release intentionally freezes scope to consolidation only: no TypeScript migration, no Canva API integration, no major refactors, and no Flathub submission in this tag.

## [1.4.10-rc.1] - 2026-04-26

### Notes
- Release candidate cut for final stabilization before promoting to `1.4.10`.

## [1.4.10-dev.20] - 2026-04-26

### Added
- Added `scripts/validate-project.sh` as a single quality-gate command that runs lint, tests, docs link checks, Flatpak validation, and `git diff --check`.
- Added `docs/DEVELOPMENT.md` with dev20 scope boundaries and recommended implementation order.
- Added `docs/VALIDATION.md` with baseline diagnostics and close-out validation steps.

### Changed
- Updated `README.md` status and phase map for the dev20 quality-gates cycle.
- Updated `docs/RELEASE_CHECKLIST.md` to a dev20 checklist focused on version alignment, validation automation, and documentation consistency.
- Added npm script `validate:project` to call `./scripts/validate-project.sh`.

### Notes
- Large UI redesigns, deep Flatpak rework, framework migration, and aggressive refactors remain intentionally deferred to later phases.

## [1.4.10-dev.19] - 2026-04-26

### Changed
- Migrated active Flatpak app-id, desktop/metainfo filenames, icon identifiers, and runtime WMClass usage from `com.canva.Linux` to `io.github.PirateMaryRead.canva-linux`.
- Standardized the public project name as `Canva Linux` and aligned package metadata wording to `A community opensource desktop wrapper for use with Canva`.
- Updated local and Flathub manifests, launch/runtime scripts, validation helpers, and documentation to use the new app-id and naming guidance.
- Added dev19 branding/app-id validation guardrails in `scripts/validate-flatpak.sh` and `scripts/validate-flathub-submission.sh`.
- Updated AppStream metadata with an explicit community/non-endorsed disclaimer and added `<replaces><id>com.canva.Linux</id></replaces>` for migration context.

### Notes
- Development builds before `1.4.10.dev19` used `com.canva.Linux`.
- The Flathub-facing app-id is now `io.github.PirateMaryRead.canva-linux`; existing local installs should uninstall the old ID before installing the new one.
- Flatpak permission policy from `1.4.10-dev.18` remains unchanged in this phase.

## [1.4.10-dev.18] - 2026-04-26

### Changed
- Consolidated Flatpak permission policy for Canva-Linux based on real workflows including login persistence, upload/export, media playback, video editing, microphone/webcam compatibility, and desktop integration.
- Kept the local and Flathub-submission manifests aligned on the same runtime sandbox permission policy.
- Removed `--talk-name=org.freedesktop.ScreenSaver` from both Flatpak manifests because no required Canva-Linux runtime flow currently depends on direct ScreenSaver D-Bus access.
- Documented permissions that must not be added without explicit maintainer review: broad home access, full device access, broad session/system bus sockets, and explicit portal bus access.
- Added validation guards that fail when forbidden permissions reappear or required runtime permissions are missing in either manifest.
- Standardized human-facing phase and branch naming to `1.4.10.devX` while preserving SemVer package versions as `1.4.10-dev.X`.

### Notes
- This is the final permissions consolidation pass before branding/trademark and final submission validation work.
- Runtime behavior should be manually validated for login, upload, export, video editing, audio, microphone/webcam capture, and custom eyedropper flows.

## [1.4.10-dev.17] - 2026-04-25

### Changed
- Standardized the public project identity as **Canva-Linux** across package metadata, Electron product naming, executable naming, and primary user-facing copy.
- Standardized Linux bundle artifact naming to `dist/canva-linux-$VERSION.flatpak` in build/validation scripts and related docs.
- Updated repository-facing metadata links and captions to point to the `canva-linux` project naming.
- Updated desktop-visible metadata (`data/com.canva.Linux.desktop` and `data/com.canva.Linux.metainfo.xml`) to show **Canva-Linux** naming and desktop-wrapper wording.
- Aligned core documentation and release/validation checklists to the `1.4.10-dev.17` naming-alignment phase.
- Added post-dev17 roadmap planning (`dev18` through `dev21`) covering permissions, app-id/branding strategy, submission-manifest final validation, and RC/stable closure.
- Migrated Flatpak identity to `com.canva.Linux` (app-id, desktop/metainfo filenames, icon identifiers, and WMClass fields) for full branding alignment.
- Finalized documentation alignment after the rename, including `README.md` next-phase transition to `1.4.10-dev.18` and AI workflow guidance updates for the dev17→dev18 handoff.

### Notes
- This patch includes an app-id identity migration and may require manual reinstall or user-data migration handling for environments previously using the old app-id.

## [1.4.10-dev.16] - 2026-04-25

### Changed
- Disabled Chromium/Electron `Floss` runtime feature in `configureLinuxRuntime()` to reduce non-fatal Bluetooth/Floss startup noise inside Flatpak sandbox logs.
- Added a dedicated `packaging/flathub/` submission workspace with a separate Flathub-oriented manifest, `generated-sources.json` npm dependency manifest, and helper scripts to regenerate it from `package-lock.json`.
- Switched the submission manifest source strategy to a pinned public archive (`type: archive` + `sha256`) and clarified sandbox-only generation of `dist/linux-unpacked`, plus offline npm installation (`npm install --offline`) using generated dependency sources.
- Added submission automation scripts (`scripts/prepare-flathub-submission.sh`, `scripts/validate-flathub-submission.sh`) and moved submission manifest path to `packaging/flathub/manifest.yml`.
- Added dedicated submission-path documentation and rationale notes (`docs/FLATHUB_SUBMISSION_PATH.md`, `docs/FLATHUB_SUBMISSION_NOTES.md`), including a material non-triviality rationale against simple-web-wrapper rejection risk.
- Updated documentation to formalize separation between the repository-root local manifest workflow and Flathub submission assets.

### Notes
- The repository-root `com.canva.Linux.yml` remains the canonical local install/bundle manifest.
- Flathub submission assets now live under `packaging/flathub/` and should be reviewed independently before submission PRs.
- System Bluetooth availability and Flatpak DBus/portal permission model are unchanged.

## [1.4.10-dev.15] - 2026-04-25

### Added
- Added Playwright as a dev-only dependency for minimal Electron smoke coverage.
- Added a smoke test that launches the app in development mode and waits for the first BrowserWindow.
- Added dedicated npm scripts for Playwright smoke execution.

### Notes
- This is phase 5 of the planned testing architecture work.
- Production runtime behavior is intentionally unchanged in this patch.

## [1.4.10-dev.14] - 2026-04-25

### Added
- Added a lightweight wiring test for the main-process tab flow using `node:test`.
- Added a dedicated npm script for the wiring-focused test phase.

### Changed
- Added a narrow dependency-injection seam in `electron/main/tab-controller.js` so the tab event attachment path can be verified without changing production behavior.

### Notes
- This is phase 4 of the planned testing architecture work.
- Production runtime behavior is intentionally unchanged in this patch.

## [1.4.10-dev.12] - 2026-04-25

### Added
- Added `node:test` unit coverage for the extracted main-process window-open policy.
- Added npm test scripts for the first unit-test phase of the `1.4.10-dev.X` testing roadmap.

### Notes
- This is phase 3 of the planned testing architecture work.
- Production runtime behavior is intentionally unchanged in this patch.

## [1.4.10-dev.11] - 2026-04-25

### Changed
- Extracted the main-process window-open policy from `electron/main/index.js` into a dedicated module without changing runtime behavior.
- Kept the shared navigation classifier as the injected source of truth while isolating the local main-process tab/oauth category mapping for future tests.

### Notes
- This is phase 2 of the planned testing architecture work.
- Runtime behavior is intentionally unchanged in this patch.

## [1.4.10-dev.10] - 2026-04-25

### Changed
- Prepared the `1.4.10-dev.X` testing cycle with documentation-only updates for AI/vibecoding guidance, roadmap alignment, and phase planning.
- Aligned the main repository docs with the planned phased sequence for `dev.10`, `dev.11`, `dev.12`, `dev.14`, `dev.15`, and `dev.16+`.

### Notes
- This is phase 1 of the planned testing architecture work.
- Runtime behavior is intentionally unchanged in this patch.

## [1.4.10-dev.9] - 2026-04-25

### Changed
- Renamed the shared `classifyWindowOpenRequest` import alias in `electron/main/index.js` to `sharedClassifyWindowOpenRequest` for clearer main-process navigation hardening flow.
- Kept runtime behavior unchanged while making the shared-versus-local window-open classification boundary more explicit for review and maintenance.

### Notes
- This is a small follow-up maintenance patch on top of `1.4.10-dev.8`.
- No user-facing behavior is intentionally changed.

## [1.4.10-dev.8] - 2026-04-25

### Added
- Added a dependency-free preload bundling step that generates `electron/preload/canva.bundle.js` from the modular preload source files before local start and Electron Builder packaging.
- Added documentation for the preload bundle architecture and the custom eyedropper regression it fixes.

### Fixed
- Fixed the custom Canva eyedropper regression introduced by the preload modularization. The Canva editor could start the preload but fail nested local module resolution inside Electron's packaged/sandboxed preload context, preventing `./debug` and the custom eyedropper modules from loading.
- Fixed the false `installed=false` eyedropper diagnostic by exposing an idempotent preload-side install probe and checking the actual wrapped `EyeDropper` state instead of only checking local preload function scope.
- Kept the custom picker routed through the bundled `ltcodedev/eyedropper` implementation instead of falling back to Chromium, portal, or native system color picking.
- Blocked unsafe external URL schemes from being forwarded to the system opener.
- Removed the active-tab eyedropper snapshot fallback so snapshot IPC only serves the requesting Canva tab.
- Cleaned up the custom eyedropper overlay when an `AbortSignal` cancels the pick operation.

### Changed
- The app now points Canva tabs at `electron/preload/canva.bundle.js` while keeping `electron/preload/*.js` as the human-maintained source of truth.
- The generated preload bundle is ignored by Git and ESLint; it must be regenerated through `npm run build:preload`, `npm start`, or `npm run dist`.
- Clarified validation, release, Flathub, and maintenance documentation for the generated preload bundle and the restored custom eyedropper path.
- Consolidated duplicated Flatpak build steps into shared script helpers used by local install and bundle generation.
- Release bundle generation now rebuilds the Electron output and Flatpak repo by default; `--use-existing-repo` is explicit for non-release reuse.
- Removed unused inherited image-loading helpers from the bundled eyedropper library copy.
- Removed Flathub-linted legacy host font filesystem access and explicit portal bus talk-name access from the Flatpak manifest.
- Added AppStream `vcs-browser` metadata and documented the local-only screenshot mirror limitation for repo lint.

### Validation
- Verified that the editor tab loads the bundled preload, installs the wrapper, intercepts `EyeDropper.open()`, captures the active Canva tab snapshot, opens the custom picker canvas, picks a color, and resolves the eyedropper promise.

## [1.4.10-dev.7] - 2026-04-25

### Changed
- Further refactored the Electron main process by extracting logging and shell helpers from the entrypoint.
- Centralized common shell background color logic and shared web preferences into modular helpers.
- Improved `index.js` readability by focusing it on orchestration and process-wide composition.

### Notes
- This is a continuation of the maintainability refactor for the `1.4.10-dev.X` cycle.
- Runtime behavior remains stable and unchanged.

## [1.4.10-dev.6] - 2026-04-24

### Added
- Added Flathub source strategy documentation for future source-based submission.
- Added checklist coverage for source archive/tag review and screenshot URL review.
- Added centralized terminal and file-backed debug logging with a per-start `current.log`.

### Changed
- Cleaned desktop metadata for Flathub readiness.
- Improved validation documentation around Flathub source strategy and release separation.
- Reviewed Linux workflow script behavior for packaging-readiness cleanup.
- Refactored the Electron runtime into modular `main`, `preload`, and shared helper directories.
- Split Canva preload responsibilities into dedicated modules for debug transport, upload diagnostics, native EyeDropper wrapping, and custom picker flow.
- Documented that Canva Linux must always use the bundled `ltcodedev/eyedropper` implementation as the custom colorpicker path.

### Notes
- This is a Flathub source/readiness hardening pass plus an internal runtime refactor for maintainability.
- Runtime and OAuth behavior are intentionally kept stable from the user perspective.
- GitHub .flatpak release bundles and Flathub source builds remain separate workflows.
- Native/system picker or alternate capture paths are not the intended Canva Linux colorpicker behavior.

## [1.4.10-dev.5] - 2026-04-24

### Changed
- Refocused the `1.4.10-dev.X` cycle on Flathub validation and submission readiness.
- Reviewed AppStream metadata, desktop metadata, Flatpak manifest, permissions documentation, and Flathub checklist.
- Improved validation workflow documentation for `flatpak-builder-lint` manifest and repo checks.

### Notes
- This is a Flathub validation and packaging-readiness pass.
- Runtime behavior is not intentionally changed.
- Google OAuth remains the maintainer-tested provider; other OAuth providers remain community-tested.



## [1.4.10-dev.4] - 2026-04-24

### Added
- Added credential storage backend diagnostics on Linux using Electron `safeStorage.getSelectedStorageBackend()`.
- Added a small color-coded `[canva:session]` prefix system for high-value status/security diagnostics (`OK`, `WARNING`, `CRITICAL`).
- Added the development branch naming policy `dev/<version>` with explicit rules and examples.

### Changed
- Removed forced `password-store=basic` so Electron/Chromium can choose the best available Linux credential backend.
- Updated cycle documentation to `1.4.10-dev.4`.
- Updated project docs to explicitly state that no new runtime feature is introduced in this cycle.

### Notes
- Canva/OAuth behavior is preserved.
- Network access required by Canva and OAuth providers remains enabled.
- Flatpak Secret Service access (`--talk-name=org.freedesktop.secrets`) remains unchanged.

## [1.4.10-dev.3] - 2026-04-24

### Added
- Added Codex branch naming policy.
- Added privacy and telemetry documentation.

### Changed
- Removed deprecated build-flatpak.sh.
- Hardened Flatpak permissions.
- Added safe Electron privacy hardening without breaking Canva behavior.

### Notes
- No runtime behavior is intentionally changed.
- Networking remains enabled to support Canva and OAuth flows.

## [1.4.10-dev.2] - 2026-04-24

### Added
- Added `canva-linux.sh` as the canonical Linux workflow command.
- Added interactive workflow mode when no arguments are provided.
- Added `--install`, `--bundle`, `--validate`, `--uninstall`, `--reset-user-data`, and `--help` actions.
- Added support for chained workflow actions executed in the order provided.
- Added a Flathub submission checklist for validation, screenshots, permissions, release source, and manual review.

### Changed
- Kept `build-flatpak.sh` as a deprecated compatibility wrapper.
- Improved CLI help output and argument handling for the Flatpak workflow.
- Changed unknown-option behavior to show available options and exit non-zero.
- Improved action parsing to reject incompatible or duplicate action combinations before execution.
- Simplified the interactive menu by removing duplicated workflow entries.
- Moved user data reset above uninstall actions for easier OAuth/session testing.
- Updated documentation to prefer `canva-linux.sh`.

### Notes
- This is a packaging workflow usability pass for the `1.4.10-dev.X` cycle.
- No runtime behavior is intentionally changed.

## [1.4.10-dev.1] - 2026-04-24

### Added
- Added a dedicated local Flatpak install script.
- Added a dedicated Flatpak bundle generation script.

### Changed
- Changed build-flatpak.sh into a compatibility wrapper for install and bundle workflows.
- Updated validation and documentation for the split Flatpak workflow.
- Restored legacy `--skip-npm` compatibility through the wrapper/local install path and improved bundle script repo validation.

### Notes
- This is a packaging workflow improvement for the 1.4.10-dev.X cycle.
- No runtime behavior is intentionally changed.

## [1.4.9] - 2026-04-24

### Added
- Added Flatpak bundle generation and validation workflow.
- Added Flathub preparation documentation, screenshot workflow, and Flatpak permission documentation.
- Added real AppStream screenshot metadata using stable commit-pinned screenshot URLs.
- Added AI-assisted development and repository maintenance documentation.

### Fixed
- Restored Google OAuth popup login flow on Linux/Wayland.
- Removed native OAuth provider icon customization attempts that caused popup regressions.
- Improved OAuth popup session sharing, visibility, focus handling, and authorized callback handling.

### Changed
- Generalized OAuth popup handling for common Canva authentication providers.
- Clarified that Canva navigation remains tab-based and separate Electron windows are reserved for OAuth/authentication flows only.
- Improved project documentation, technical notes, release workflow, and validation scripts.

### Notes
- Google OAuth was tested during this cycle.
- Facebook/Meta, Apple, and Microsoft OAuth still require manual validation and may expose provider-specific issues.
- Native OAuth provider icons remain intentionally unsupported on Linux/Wayland.
- No release-candidate build was published for this cycle.

## [1.4.9-dev.14] - 2026-04-24

### Changed
- Performed final Flathub and release-readiness documentation pass before `1.4.9-rc.1`.
- Reviewed AppStream metadata, screenshot documentation, Flatpak permission notes, and validation workflow.

### Notes
- This is a validation and release-readiness pass.
- Google OAuth was tested; Facebook/Meta, Apple, and Microsoft still require manual validation.
- No runtime behavior is intentionally changed.

## [1.4.9-dev.13] - 2026-04-24

### Added
- Added AppStream screenshot metadata using real screenshots and commit-pinned raw GitHub URLs.
- Added a screenshot manifest documenting AppStream order, privacy review status, and supporting screenshot notes.

### Changed
- Updated Flathub and screenshot documentation to reflect the active AppStream screenshot integration path.
- Clarified that `windowpopup.png` is supporting documentation material and not the primary Flathub screenshot.

### Notes
- Screenshot URLs are pinned to a stable commit SHA, not a branch.
- Google OAuth was tested during development; Facebook/Meta, Apple, and Microsoft still require manual validation.
- No runtime behavior is intentionally changed.

## [1.4.9-dev.12] - 2026-04-24

### Changed
- Bumped project version metadata to `1.4.9-dev.12`.
- Aligned the screenshot staging documentation with the real local Flathub/AppStream screenshot set in `assets/screenshots/`.
- Updated AppStream release metadata to reflect the current screenshot-preparation pass while intentionally keeping screenshot URLs out of MetaInfo until stable tag, commit, or release URLs exist.
- Added the AppStream developer display name required by `appstreamcli` metadata validation.

### Notes
- The staged screenshot set currently includes `home.png`, `tabs.png`, `upload.png`, `eyedropper.png`, and `windowpopup.png`.
- `editor.png` is intentionally not referenced because it does not exist locally.
- Flathub submission remains separate from GitHub release bundle publication.
- No runtime behavior is intentionally changed.

## [1.4.9-dev.10] - 2026-04-24

### Added
- Added local screenshot staging workflow for future Flathub/AppStream metadata.
- Documented the expected real screenshot set for Home, editor, tabs, upload, and eyedropper flows.

### Notes
- Screenshots are staged locally first and should not be referenced in MetaInfo until stable release/tag URLs exist.
- No runtime behavior is intentionally changed.

## [1.4.9-dev.9] - 2026-04-23

### Changed
- Cleaned up development changelog notes after the OAuth stabilization cycle.
- Documented OAuth provider test coverage: Google was tested; Facebook/Meta, Apple, and Microsoft still require manual validation.
- Refocused the `1.4.9-dev.X` cycle on Flathub readiness after the OAuth regression fix.

### Notes
- This is a documentation and release-readiness cleanup pass.
- No runtime behavior is intentionally changed.

## [1.4.9-dev.8] - 2026-04-23

### Changed
- Generalized the working OAuth popup session and callback handling for common Canva authentication providers.
- Clarified OAuth diagnostics to emphasize shared session matching instead of unreliable partition labels.

### Notes
- Native OAuth provider icons remain intentionally unsupported.
- Canva navigation remains tab-based; separate windows remain reserved for OAuth/authentication only.

## [1.4.9-dev.7] - 2026-04-23

### Fixed
- Made OAuth popups explicitly share the same persistent `persist:canva` session as the main Canva tabs.
- Improved OAuth popup visibility and focus handling on Linux/Wayland.

### Changed
- Removed favicon/provider-icon behavior from OAuth popup handling.
- Added diagnostics for OAuth popup session sharing, visibility, focus, bounds, navigation, failures, and authorized callbacks.

### Notes
- Native OAuth provider icons remain intentionally unsupported.
- Canva content remains tab-based; separate Electron windows remain reserved for OAuth/authentication only.

## [1.4.9-dev.6] - 2026-04-23

### Fixed
- Improved OAuth popup completion handling after provider login redirects.

### Superseded status
- This intermediate OAuth iteration was superseded by the session-sharing fix in `1.4.9-dev.7` and provider-neutral stabilization in `1.4.9-dev.8`.

### Changed
- Added OAuth popup lifecycle diagnostics for session partition, redirect completion, load failures, and unexpected closure.

### Notes
- Native OAuth provider icons remain intentionally unsupported.
- Canva navigation remains tab-based; separate windows remain reserved for OAuth/authentication only.

## [1.4.9-dev.5] - 2026-04-23

### Fixed
- Removed OAuth popup native provider icon customization attempts to restore stable popup behavior on Linux/Wayland.

### Superseded status
- Earlier provider-icon experiments are considered failed and superseded by the stable OAuth path documented in `1.4.9-dev.7` and `1.4.9-dev.8`.

### Added
- Added screenshot preparation documentation for future Flathub/AppStream metadata.
- Added a screenshots staging directory with privacy and release guidance.

### Changed
- Documented the window and tab policy: normal Canva navigation stays in tabs, while separate Electron windows are reserved for OAuth/authentication flows only.
- Expanded login persistence documentation for the shared `persist:canva` Electron session used by Canva tabs and OAuth popups.

### Notes
- Real screenshots are intentionally not added yet.
- OAuth native popup provider icons remain a known Linux/Wayland limitation.
- No unrelated runtime behavior is intentionally changed.

## [1.4.9-dev.4] - 2026-04-23

### Added
- Added Flatpak permission documentation for the current manifest and future Flathub review.
- Added validation coverage for the Flatpak permission documentation.

### Changed
- Clarified Flatpak manifest permission intent and Flathub lint considerations.
- Improved distribution documentation around sandbox permissions and future permission changes.

### Notes
- This is a Flatpak packaging and documentation pass for the `1.4.9-dev.X` cycle.
- No unrelated runtime behavior is intentionally changed.

## [1.4.9-dev.3] - 2026-04-23

### Added
- Added Flathub preparation documentation covering submission requirements, metadata expectations, lint checks, screenshots, and permission review.
- Added optional Flathub-oriented validation checks for desktop metadata, AppStream metadata, manifest linting, and repository linting.

### Changed
- Clarified the difference between GitHub release Flatpak bundles and future Flathub submission workflow.
- Improved local Flatpak validation output for distribution readiness.

### Notes
- This is a distribution-readiness and documentation pass for the `1.4.9-dev.X` cycle.
- No unrelated runtime behavior is intentionally changed.

## [1.4.9-dev.2] - 2026-04-23

### Added
- Added automatic Flatpak bundle generation to `build-flatpak.sh`.
- Added `scripts/validate-flatpak.sh` for local Flatpak and metadata validation.

### Changed
- Updated build documentation to describe the generated `dist/canva-linux-$VERSION.flatpak` artifact.

### Notes
- This is a distribution workflow improvement for the `1.4.9-dev.X` cycle.
- No unrelated runtime behavior is intentionally changed.

## [1.4.9-dev.1] - 2026-04-24

### Added
- Added AI-assisted development and vibecoding instructions in `docs/AI_DEVELOPMENT.md`.
- Added a project convention for `##` section markers in scripts and large source files to improve readability for human and AI maintainers.

### Changed
- Updated `build-flatpak.sh` with helpful `##` section markers for readability, without changing runtime behavior.
- Updated repository documentation links to include `docs/AI_DEVELOPMENT.md` and reinforce changelog-first maintenance.
- Bumped project version metadata to `1.4.9-dev.1` for this development delivery.

### Notes
- This is a non-functional maintenance patch focused on AI-assisted workflow conventions, documentation alignment, and readability.
- Native Linux/Wayland OAuth popup icon work remains out of scope unless explicitly requested.

## [1.4.8] - 2026-04-23

### Changed
- Promoted the validated 1.4.8 release candidate to the stable 1.4.8 release.
- Finalized the 1.4.8 stabilization cycle documentation.

### Notes
- This release includes the documented DEV4–DEV7 consolidation work and the RC validation pass.
- No runtime behavior is intentionally changed from 1.4.8-rc.1.
- Known Linux/Wayland limitations remain documented.

## [1.4.8-rc.1] - 2026-04-23

### Changed
- Promoted the documented `1.4.8-dev.X` stabilization cycle to the first release candidate.
- Clarified release-candidate validation expectations before the final `1.4.8` release.

### Notes
- This release candidate is intended for final manual validation only.
- No runtime behavior is intentionally changed.
- Known limitations from the development series still apply.

## [1.4.8-dev.7] - 2026-04-23

### Changed
- Updated project version references to `1.4.8-dev.7`.
- Added `docs/RELEASE_CHECKLIST.md` to formalize final release-readiness checks for the `1.4.8-dev.X` closure.
- Added `docs/MANUAL_VALIDATION.md` to standardize baseline manual runtime validation before release promotion.
- Updated `README.md` and `docs/TECHNICAL.md` to reflect DEV7 release-closure scope and documentation map.

### Notes
- This is a non-functional DEV7 maintenance patch focused on release closure documentation and validation guidance.
- Linux/Wayland OAuth popup icon behavior remains a known limitation and was intentionally left unchanged.

## [1.4.8-dev.6] - 2026-04-23

### Changed
- Added focused inline comments in `electron/main.js` to clarify `WebContentsView` shell intent, fixed Home-tab guardrails, persistent partition usage, and OAuth popup completion lifecycle.
- Added short comments in preload scripts to document debug-category aliases and why drag/upload ingress tracking is correlated across events.
- Added launcher/build/manifest comments describing Wayland/X11 runtime flags, category-filtered debug logging, and Flatpak permission intent.
- Updated technical docs and README version references for the DEV6 readability patch.

### Notes
- This is a non-functional DEV6 maintenance patch focused on code readability and diagnostics clarity.
- Linux/Wayland OAuth popup icon behavior remains a known limitation and was intentionally left unchanged.

## [1.4.8-dev.5] - 2026-04-23

### Changed
- Cleaned repository patch leftovers by removing tracked backup/reject artifacts (`*.bak`, `*.orig`, `*.rej`).
- Added `docs/TECHNICAL.md` to centralize technical repository notes under `/docs`.
- Updated project version references from `1.4.8-dev.4` to `1.4.8-dev.5`.

### Notes
- This is a non-functional DEV5 maintenance patch focused on repository hygiene and documentation organization.
- Linux/Wayland OAuth popup icon behavior remains a known limitation and was intentionally left unchanged.

## [1.4.8-dev.4] - 2026-04-23

### Changed
- Reworked the README as the main project orientation document for the DEV4 consolidation phase.
- Documented the current Electron shell architecture, including `WebContentsView`, the fixed Home tab, persistent sessions, OAuth popups, preload scripts, and Flatpak packaging files.
- Expanded debug category documentation with short descriptions for `startup`, `app`, `tabs`, `view`, `oauth`, `dnd`, `upload`, `permissions`, `session`, and `eyedropper`.
- Clarified the stable-versus-development version flow for the `1.4.8-dev.X` branch.
- Added official reference links for `WebContentsView`, Electron sessions, and Electron permission handling.

### Notes
- This is a documentation-only DEV4 patch and does not intentionally change runtime behavior.
- Native Linux/Wayland OAuth popup icon replacement is now treated as a known limitation instead of an active `1.4.8-dev.X` target.
- Stale backup and rejected patch files in the repository are documented as a DEV4 cleanup item to review before promoting the branch.


## [1.4.8-dev.3] - 2026-04-23

### Added
- Added clipboard ingress diagnostics for paste-heavy workflows, including `beforeinput`, `paste`, `navigator.clipboard.read()`, and MIME summary logging for text, HTML, URLs, images, and files when available.
- Added upload pipeline correlation IDs so drag, paste, picker, `FormData`, `fetch`, `XMLHttpRequest`, and `sendBeacon` logs can be tied back to the most recent ingress source.
- Added file picker cancellation diagnostics for `<input type="file">` where Chromium emits a `cancel` event.

### Fixed
- Fixed OAuth popup diagnostics so popup title and favicon updates no longer reference an undefined tab object during real popup flows.
- Fixed popup lifecycle logging so real OAuth popup state changes are easier to follow during clean-session retests.
- Fixed upload observability gaps after drop or paste by logging file-bearing `FormData` and network dispatches when Canva begins an import or upload request.

### Validated in current testing
- Startup summaries remain available in the terminal and still describe the current development status.
- The fixed Home tab shell and custom eyedropper continue to load without regression in the development branch.

### Under observation
- Full clean-session OAuth completion should still be retested after clearing local Flatpak data.
- Host file picker continuation and clipboard-driven imports should now be tested against the richer upload/network logs introduced in this build.

## [1.4.8-dev.2] - 2026-04-23

### Added
- Added startup release-status logs that summarize what this build corrected, validated, and still keeps under observation.
- Added upload ingress correlation logs so file-input and picker events now report the most recent drop, paste, or picker source.
- Added `HTMLInputElement.showPicker()` diagnostics for file inputs when the host browser API is available.

### Changed
- Refined window-open logging so normal Canva tab creation is reported under `tabs` instead of `oauth`.
- Refined tab navigation logging so OAuth diagnostics are only emitted when navigation is actually promoted into an OAuth popup flow.

### Validated
- Confirmed Linux Wayland startup, persistent session initialization, the fixed Home tab shell, and the custom eyedropper remain stable in current testing.
- Confirmed host drag-and-drop into the Canva editor reaches the editor with a real file drop on Wayland.

### Under observation
- Host file picker completion and post-drop upload continuation inside Canva still need broader cross-flow validation.
- OAuth popup completion paths still need targeted retesting after the `WebContentsView` migration.

## [1.4.8-dev.1] - 2026-04-23

### Added
- Added richer drag-and-drop diagnostics with `DataTransfer.items`, `dropEffect`, `effectAllowed`, and input metadata logging.
- Added upload observability for file input clicks, clipboard file pastes, and `showOpenFilePicker()` activity when available.
- Added compatibility aliases so legacy `drag` debug requests still enable the canonical `dnd` category.

### Fixed
- Fixed category normalization so `CANVA_DEBUG=dnd` now emits drag-and-drop diagnostics consistently instead of silently depending on an internal `drag` label.
- Fixed debug prefix normalization so forwarded preload logs use the canonical category names in the main process output.

### Notes
- This is a development iteration on top of the stable `1.4.7` base.
- The goal of this build is observability for real Wayland drag-and-upload testing, not UI changes.

## [1.4.7] - 2026-04-23

### Added
- Added structured global debug categories across the application: `startup`, `app`, `tabs`, `view`, `oauth`, `dnd`, `upload`, `permissions`, `session`, and `eyedropper`.
- Added category-filtered debug support through `CANVA_DEBUG=1` or `CANVA_DEBUG=category1,category2`.
- Added toolbar debug forwarding for tab actions and tab state updates.

### Changed
- Updated the launcher so debug logging is enabled for any non-empty `CANVA_DEBUG` value, not only `CANVA_DEBUG=1`.
- Updated post-install instructions to describe full-app debug mode and category filters.
- Preserved the current Wayland-first shell behavior and the working custom eyedropper while expanding diagnostics to the whole application.

### Notes
- This release improves observability but does not yet prove that Wayland drag-and-drop from the host is fully fixed.
- The next validation step is to capture real drag-and-drop and file picker logs using the new global debug categories.

## [1.4.6] - 2026-04-23

### Added
- Added origin-aware `fileSystem` permission handling for Canva upload and file access flows.
- Added drag-and-upload debug instrumentation in the Canva preload for Wayland diagnostics.
- Added a mouse-release safety cleanup after `dragend` and `drop` events to reduce stuck drag states on Wayland.

### Changed
- Switched the launcher to rely on Electron's native platform auto-selection by default instead of forcing an Ozone hint.
- Kept explicit `CANVA_FORCE_WAYLAND=1` and `CANVA_FORCE_X11=1` overrides for troubleshooting.
- Preserved the working eyedropper and `WebContentsView` shell while focusing this release on Wayland drag/upload stability.

### Under observation
- Native Wayland drag-and-drop can still be affected by compositor and Chromium-side bugs on some desktops, especially KDE Plasma with KWin.
- Host file uploads should be retested using both drag-and-drop and file picker flows after this release.

## [1.4.5] - 2026-04-23

### Added
- Added provider-specific OAuth popup chrome updates with dynamic popup titles.
- Added provider-specific popup icon handling based on the current OAuth provider favicon, with a generated fallback icon per provider.
- Added brief code comments for the `WebContentsView` shell migration paths.

### Changed
- Migrated the shell from deprecated `BrowserView` usage to `WebContentsView`.
- Reworked tab visibility handling to use native `View` layout and visibility controls.
- Kept the fixed Home tab behavior and the working eyedropper implementation while moving the shell to `WebContentsView`.
- Preserved the Wayland-first launcher behavior with manual X11 and Wayland overrides.

### Potential bugs under observation
- Wayland drag-and-drop may still hit compositor-side issues in some environments. Current logs showed `Invalid state when trying to start drag. source=kMouse` during Wayland usage, so drag workflows should be retested after this shell migration.
- GPU and VAAPI warnings may still appear on NVIDIA systems depending on host drivers and compositor support.

## [1.4.4] - 2026-04-23

### Added
- Added explicit post-install instructions for forcing X11 and Wayland.
- Added updated English documentation for the Wayland-preferred shell behavior.

### Changed
- Switched the launcher to prefer native Wayland in Wayland sessions.
- Kept X11 available as an automatic fallback on non-Wayland sessions and as a manual override with `CANVA_FORCE_X11=1`.
- Merged the recent shell UI changes into the working eyedropper build.
- Removed duplicate source icon names so the package now ships only the canonical `com.canva.Linux` icon assets.

### Notes
- This release focuses on the shell runtime mode and merges the recent Home-tab UI behavior with the now-working custom eyedropper.
- The next iteration should focus on performance cleanup and `WebContentsView` migration.

## [1.4.3] - 2026-04-23

### Added
- Added a project-wide changelog.
- Added short English code comments to the main shell files.
- Added a GNU GPL v3.0-or-later license file.
- Added English documentation about the project goal, architecture, and references.

### Changed
- Removed the toolbar **Open new tab** button.
- Made the **Home** tab fixed and non-closable.
- Changed the **Home** toolbar button to focus the existing Home tab instead of opening a duplicate Home page.
- Updated README, build notes, and post-install instructions in English.
- Clarified that the project goal is Windows-like Canva workflow parity through Electron/Chromium on top of Flatpak Freedesktop.

### Notes
- Eyedropper work continues in the following iteration.
- This release focuses on shell UI behavior, documentation, and licensing.
