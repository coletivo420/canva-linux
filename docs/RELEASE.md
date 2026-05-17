# Release

`canva-linux-c420ui-builder` is the Canva Linux public alias for the internal `c420ui-builder` entrypoint.
For the builder naming contract, see [c420ui Builder Alias Policy](c420ui/BUILDER_ALIAS.md).

## Canva Linux 0.1.4-15.Dev.7 Alpha

Release: `v0.1.4-15.Dev.7`

### Public artifacts

- `canva-linux-0.1.4-15.Dev.7-x86_64.AppImage`
- `canva-linux-0.1.4-15.Dev.7-x86_64.flatpak`
- `canva-linux-0.1.4-15.Dev.7-linux-unpacked-x86_64.tar.gz`
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
- generate `SHA256SUMS` from the real generated file names;
- fail if expected artifacts are missing;
- preserve upstream/tooling architecture strings such as `x86_64` or `X86_64`;
- fail if the tag does not match the public release version;
- fail if source JavaScript appears outside allowed generated/dependency paths;
- fail if active docs reference removed interface routing flags.

### Manual validation matrix

- `./canva-linux-c420ui-builder` opens the c420ui.
- F5 copies logs to the clipboard.
- Text selection mode disables c420ui mouse capture globally.
- F6 opens a plain logs view with the session log path.
- Correct root password starts privileged actions.
- Incorrect root password shows an error popup and does not start the action.
- Native system/user installs complete and show detected versions.
- Flatpak system/user installs complete and show detected versions.
- AppImage artifacts build and execute.
- Flatpak bundle builds and installs.
- Uninstall removes only the selected scope.
- Purge removes installations and data only after confirmation.
- Any builder command argument runs direct CLI mode.
- Active docs do not cite removed interface routing flags.

### Release notes template

Canva Linux 0.1.4-15.Dev.7 Alpha

Highlights:

- TypeScript-first migration completed.
- c420ui and direct CLI architecture stabilized.
- Native and Flatpak system/user install flows.
- Root authentication popup for privileged actions.
- Improved detection with installed version display.
- AppImage and Flatpak package artifacts.
- Improved c420ui logs, clipboard and manual text selection mode.
- Secret Service-backed persistent login with an ephemeral session fallback when secure credential storage or safe storage encryption is unavailable.

Artifacts:

- AppImage, preserving the generated architecture suffix
- Flatpak bundle, preserving the Flatpak architecture string
- linux-unpacked tarball, preserving the host/tool architecture string
- SHA256SUMS, containing the real generated file names

Known limitations:

- Persistent login requires a secure Linux Secret Service backend such as KWallet or GNOME Keyring/libsecret.
  Without it, Canva Linux uses an ephemeral session and does not save login state.
- `.deb`, `.rpm`, and AUR packaging are planned for a later line.
- Flathub submission hardening continues separately.
- Some terminal emulators may still require Shift while selecting text.


Canva Linux Builder powered by c420ui is the primary builder, installer, validation, packaging, maintenance and project diagnostics entrypoint. The compiled `canva-linux` Electron app remains the final runtime application.

Canva Linux Builder powered by c420ui does not maintain its own action allowlist;
direct action flags are delegated to the c420ui CLI bridge and resolved by the Action Registry,
while runtime flags belong to the compiled `canva-linux` app.
