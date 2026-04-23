# Changelog

All notable changes to this project are documented in this file.

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
