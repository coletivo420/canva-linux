# Changelog

All notable changes to this project are documented in this file.

## [1.4.8] - 2026-04-23

### Fixed
- Fixed OAuth popup debug handlers that referenced an undefined `tab` variable during popup title and favicon updates.
- Fixed drag-and-drop category routing so `CANVA_DEBUG=dnd` now captures drag diagnostics consistently, and `drag` is accepted as a backward-compatible alias.
- Fixed noisy upload instrumentation so generic document change events are no longer logged unless the target is a real file input.

### Changed
- Normalized debug category parsing across the main process and both preload scripts.
- Hardened debug payload serialization for toolbar actions to avoid log-side crashes with unexpected objects.
- Excluded accidental `.bak` source backups from packaging and added them to `.gitignore`.

### Notes
- This patch focuses on debug reliability and small runtime cleanup without changing the current shell architecture.
- The host/runtime warnings seen in Chromium, DBus, Wayland, and VAAPI output still depend on the desktop session and Flatpak environment and are not fully actionable from this wrapper alone.

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
