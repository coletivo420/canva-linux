# Release

## Canva Linux 0.1.4-12 Alpha

Release: `v0.1.4-12`

### Public artifacts

- `canva-linux-0.1.4-12-x86_64.AppImage`
- `canva-linux-0.1.4-12.flatpak`
- `canva-linux-0.1.4-12-linux-unpacked-x86_64.tar.gz`
- `SHA256SUMS`

The `.deb`, `.rpm`, and AUR/PKGBUILD outputs remain planned for a later
packaging line.

### Release workflow

The GitHub Release workflow must:

- run from `workflow_dispatch` or a `v*` tag;
- use Node.js 22;
- install dependencies from `package-lock.json`;
- run the project validation gates;
- build the runtime, AppImage, Flatpak bundle, and linux-unpacked tarball;
- generate `SHA256SUMS`;
- fail if expected artifacts are missing;
- fail if the tag does not match the public release version;
- fail if source JavaScript appears outside allowed generated/dependency paths;
- fail if active docs reference removed interface routing flags.

### Manual validation matrix

- `./canva-linux.sh` opens the TUI.
- F5 copies logs to the clipboard.
- Text selection mode disables TUI mouse capture globally.
- F6 opens a plain logs view with the session log path.
- Correct root password starts privileged actions.
- Incorrect root password shows an error popup and does not start the action.
- Native system/user installs complete and show detected versions.
- Flatpak system/user installs complete and show detected versions.
- AppImage artifacts build and execute.
- Flatpak bundle builds and installs.
- Uninstall removes only the selected scope.
- Purge removes installations and data only after confirmation.
- Any launcher argument runs direct CLI mode.
- Active docs do not cite removed interface routing flags.

### Release notes template

Canva Linux 0.1.4-12 Alpha

Highlights:

- TypeScript-first migration completed.
- TUI and direct CLI architecture stabilized.
- Native and Flatpak system/user install flows.
- Root authentication popup for privileged actions.
- Improved detection with installed version display.
- AppImage and Flatpak package artifacts.
- Improved TUI logs, clipboard and manual text selection mode.

Artifacts:

- AppImage
- Flatpak bundle
- linux-unpacked tarball
- SHA256SUMS

Known limitations:

- `.deb`, `.rpm`, and AUR packaging are planned for a later line.
- Flathub submission hardening continues separately.
- Some terminal emulators may still require Shift while selecting text.
