# Changelog

All notable changes to this project are documented in this file.



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
- Updated build documentation to describe the generated `dist/canva-webapp-linux-$VERSION.flatpak` artifact.

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
- Removed duplicate source icon names so the package now ships only the canonical `com.canva.WebApp` icon assets.

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
