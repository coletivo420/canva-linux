# Repository Inventory

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](../c420ui/BUILDER_ALIAS.md).

This generated inventory is kept outside `REVIEW.md` so the review checklist remains a stable process document.

## Structural Contracts

- Committed build metadata lives in `build-resources/canva-linux/config/build-metadata.json` and must remain deterministic with `buildRevision: "unknown"`.
- Effective build metadata is generated under `.build/canva-linux/build-metadata.effective.json` for runtime/release artifacts and may include Git-derived revisions.
- `build-resources/` is the canonical home for project-owned runtime/build resources (`c420ui`, `electron`, `canva-linux-assets`).
- Dev11 ESM-only output uses `.build/electron/main/index.mjs`, `.build/electron/preload/canva.bundle.mjs`, and `.mjs` Node tooling/check/bootstrap artifacts. The toolbar is main-driven and has no preload bundle.
- Versioned `.cjs` files are forbidden outside external dependencies.
- Root `packages/`, `electron/`, `data/`, and loose icon assets must not be restored.

Dev12 will introduce `build-resources/c420ui-rs/` as a c420ui-owned Rust
host-operation executor after the Dev11 merge.

This Rust area is not for Canva Linux Electron runtime, toolbar, tabs,
CLeyedropper, packaging policy or project-specific adapters.

Dev12 Rust project config now lives under `build-resources/c420ui-rs/src/project`.
`c420ui-host project-config --json` validates and normalizes dependent-project
JSON declarations for actions, dependencies, install, maintenance and UI
metadata. TypeScript wrappers may call the command, but must not duplicate that
validation as the source of truth.

Dev12 Rust status panel generation lives under `build-resources/c420ui-rs/src/status`.
`c420ui-host status-panels --json` emits semantic Detected Installations,
Generated Artifacts, Linux Artifacts and Overview panels. TypeScript wrappers
may transport the response, but must not own status classification or terminal
color tags.

Dev12 Rust bootstrap and metadata handling lives under
`build-resources/c420ui-rs/src/bootstrap`,
`build-resources/c420ui-rs/src/settings`, and
`build-resources/c420ui-rs/src/session_log`. `c420ui-host` generates bootstrap
launchers, manifests, source hashes, settings state and session logs. Generated
MJS artifacts under `build-resources/c420ui/bootstrap/generated` must remain
thin launchers.

## Files

- `.codex`
- `.github/workflows/jekyll-gh-pages.yml`
- `.github/workflows/static.yml`
- `.gitignore`
- `CHANGELOG.md`
- `CLAUDE.md`
- `LICENSE`
- `README.md`
- `REVIEW.md`
- `build-resources/canva-linux/assets/screenshots/.gitkeep`
- `build-resources/canva-linux/assets/screenshots/MANIFEST.md`
- `build-resources/canva-linux/assets/screenshots/README.md`
- `build-resources/canva-linux/assets/screenshots/eyedropper.png`
- `build-resources/canva-linux/assets/screenshots/home.png`
- `build-resources/canva-linux/assets/screenshots/tabs.png`
- `build-resources/canva-linux/assets/screenshots/upload.png`
- `build-resources/canva-linux/assets/screenshots/windowpopup.png`
- `canva-linux-c420ui-builder`
- `build-resources/canva-linux/assets/icons/hicolor/128x128/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/16x16/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/22x22/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/24x24/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/256x256/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/32x32/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/48x48/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/512x512/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/icons/hicolor/64x64/apps/io.github.coletivo420.canva-linux.png`
- `build-resources/canva-linux/assets/desktop/io.github.coletivo420.canva-linux.desktop`
- `build-resources/canva-linux/assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml`
- `docs/.nojekyll`
- `docs/internal/AI_DEVELOPMENT.md`
- `docs/internal/AI_GUARDRAILS.md`
- `docs/internal/CHANGELOG_DEVELOPMENT_HISTORY.md`
- `docs/APPIMAGE_FUSE.md`
- `docs/CANVA_API.md`
- `docs/CANVA_LINUX_EYEDROPPER.md`
- `docs/CLI.md`
- `docs/DEBUGGING.md`
- `docs/DEVELOPMENT.md`
- `docs/FEATURES.md`
- `docs/notes/FLATHUB.md`
- `docs/notes/FLATHUB_CHECKLIST.md`
- `docs/notes/FLATHUB_SOURCE.md`
- `docs/notes/FLATHUB_SUBMISSION_NOTES.md`
- `docs/notes/FLATHUB_SUBMISSION_PATH.md`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/GPU_ACCELERATION.md`
- `docs/INSTALLATION.md`
- `docs/internal/LOGGING_CONTRACT.md`
- `docs/MANUAL_VALIDATION.md`
- `docs/PRIVACY.md`
- `docs/README.md`
- `docs/internal/REPOSITORY_INVENTORY.md`
- `docs/internal/legacy/RELEASE_CHECKLIST_1.4.10.md`
- `docs/ROADMAP_0.1.5.md`
- `docs/ROADMAP_0.1.6.md`
- `docs/SCREENSHOTS.md`
- `docs/TECHNICAL.md`
- `docs/TROUBLESHOOTING.md`
- `docs/TYPESCRIPT.md`
- `docs/internal/TYPESCRIPT_CONVERSION_REVIEW.md`
- `docs/VALIDATION.md`
- `docs/index.html`
- `docs/pages-refresh.txt`
- `build-resources/electron/assets/canva-icon.png`
- `build-resources/electron/main/eyedropper-bridge.ts`
- `build-resources/electron/main/gpu-diagnostics.ts`
- `build-resources/electron/main/index.ts`
- `build-resources/electron/main/ipc.ts`
- `build-resources/electron/main/lifecycle.ts`
- `build-resources/electron/main/logging-helpers.ts`
- `build-resources/electron/main/logging-normalize.ts`
- `build-resources/electron/main/logging.ts`
- `build-resources/electron/main/oauth.ts`
- `build-resources/electron/main/runtime.ts`
- `build-resources/electron/main/shell.ts`
- `build-resources/electron/main/tab-controller.ts`
- `build-resources/electron/main/tab-events.ts`
- `build-resources/electron/main/tabs.ts`
- `build-resources/electron/main/window-open-policy.ts`
- `build-resources/electron/preload/browser-capture-diagnostics.ts`
- `build-resources/electron/preload/canva.ts`
- `build-resources/electron/preload/cl-eyedropper/cl-eyedropper.ts`
- `build-resources/electron/preload/cl-eyedropper/index.ts`
- `build-resources/electron/preload/cl-eyedropper/types.ts`
- `build-resources/electron/preload/custom-eyedropper-flow.ts`
- `build-resources/electron/preload/debug.ts`
- `build-resources/electron/preload/eyedropper-routing-diagnostics.ts`
- `build-resources/electron/preload/native-eyedropper-wrapper.ts`
- `build-resources/electron/preload/toolbar.ts`
- `build-resources/electron/preload/upload-diagnostics.ts`
- `build-resources/electron/shared/debug.ts`
- `build-resources/electron/shared/navigation.ts`
- `build-resources/electron/ui/toolbar.html`
- `build-resources/config/eslint/eslint.config.ts`
- `io.github.coletivo420.canva-linux.yml`
- `package-lock.json`
- `package.json`
- `build-resources/canva-linux/config/actions.json`
- `build-resources/canva-linux/config/project-ui.json`
- `build-resources/canva-linux/packaging/flathub/README.md`
- `build-resources/canva-linux/packaging/flathub/generated-sources.json`
- `build-resources/canva-linux/packaging/flathub/manifest.yml`
- `build-resources/canva-linux/packaging/flathub/tools/generate-npm-sources.ts`
- `npm run flathub:generate-npm-sources`
- `build-resources/config/playwright/playwright.config.ts`
- `run.sh`
- `build-resources/c420ui/operations/detection/appimage-detection.ts`
- `build-resources/c420ui/operations/detection/flatpak-detection.ts`
- `build-resources/c420ui/operations/detection/install-detection.ts`
- `build-resources/c420ui/operations/detection/native-detection.ts`
- `build-resources/c420ui/operations/detection/version-marker.ts`
- `build-resources/c420ui/operations/flatpak/repo.ts`
- `build-resources/c420ui/operations/flatpak/runtime.ts`
- `build-resources/c420ui/operations/flatpak/scope.ts`
- `build-resources/c420ui/operations/install/build-metadata-marker.ts`
- `build-resources/c420ui/operations/install/desktop-cache.ts`
- `build-resources/c420ui/operations/install/desktop-entry.ts`
- `build-resources/c420ui/operations/install/icons.ts`
- `build-resources/c420ui/operations/install/native-paths.ts`
- `build-resources/c420ui/operations/install/native.ts`
- `build-resources/c420ui/operations/packaging/appimage.ts`
- `build-resources/c420ui/operations/packaging/flatpak-bundle.ts`
- `build-resources/c420ui/operations/host/guidance.ts`
- `build-resources/c420ui/operations/host/sudo.ts`
- `build-resources/c420ui/scripts/install-native.ts`
- `build-resources/c420ui/scripts/build-appimage.ts`
- `build-resources/c420ui/scripts/build-flatpak-bundle.ts`
- `build-resources/canva-linux/validation/appimage.ts`
- `build-resources/tests/cl-eyedropper-canvas.test.ts`
- `build-resources/tests/cl-eyedropper-contracts.test.ts`
- `build-resources/tests/cl-eyedropper-runtime.test.ts`
- `build-resources/tests/debug-levels.test.ts`
- `build-resources/tests/electron-smoke.spec.ts`
- `build-resources/tests/eyedropper-bridge.test.ts`
- `build-resources/tests/eyedropper-preload.test.ts`
- `build-resources/tests/gpu-diagnostics.test.ts`
- `build-resources/tests/helpers/runtime-module.ts`
- `build-resources/tests/logging-helpers.test.ts`
- `build-resources/tests/logging-normalize.test.ts`
- `build-resources/tests/navigation.test.ts`
- `build-resources/tests/oauth-helpers.test.ts`
- `build-resources/tests/preload-debug.test.ts`
- `build-resources/tests/runtime.test.ts`
- `build-resources/tests/tab-controller-wiring.test.ts`
- `build-resources/tests/tabs-state.test.ts`
- `build-resources/tests/upload-diagnostics.test.ts`
- `build-resources/tests/window-open-policy.test.ts`
- `build-resources/config/typescript/tsconfig.build.json`
- `build-resources/config/typescript/tsconfig.json`
- `build-resources/config/typescript/tsconfig.strict.json`

- `build-resources/c420ui/scripts/c420ui-builder.ts`
