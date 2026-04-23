# Canva WebApp - Flatpak + Electron

An unofficial Linux desktop wrapper for Canva built with Electron/Chromium and packaged with the Flatpak Freedesktop runtime.

## Project goal

This project aims to run Canva on Linux through Electron/Chromium while preserving as much of the Windows desktop workflow as possible, including:

- persistent sessions and OAuth popups
- internal tab handling for Canva pages
- file access inside the user home directory
- desktop integration through Flatpak and Freedesktop SDK components
- continued work toward feature parity for plugins, editors, and creative tools that Canva users expect on desktop

This project is **unofficial** and is **not affiliated with Canva Pty Ltd**.

## Current shell behavior

- the **Home** tab is fixed and cannot be closed
- the **Home** button always switches back to the existing Home tab
- the **Home** button never creates a duplicate Home tab
- normal Canva pages still open in internal tabs
- compatible OAuth providers open in a separate popup window that shares the same persistent session partition
- OAuth popups now update their window title and icon to reflect the current provider when possible
- the current build prefers **native Wayland** in Wayland sessions and uses **X11** automatically on non-Wayland sessions
- startup debug logs now summarize what the current development build corrected, validated, and still keeps under observation

## Build

```bash
chmod +x build-flatpak.sh
./build-flatpak.sh
```

## Post-install commands

```bash
flatpak run com.canva.WebApp
CANVA_DEBUG=1 flatpak run com.canva.WebApp
CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp
CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp
CANVA_FORCE_X11=1 flatpak run com.canva.WebApp
flatpak uninstall --user com.canva.WebApp
```

## Debug categories

`CANVA_DEBUG=1` enables full wrapper debug output.

You can also filter debug output by category, for example:

```bash
CANVA_DEBUG=oauth,dnd flatpak run com.canva.WebApp
```

Available categories include: `startup`, `app`, `tabs`, `view`, `oauth`, `dnd`, `upload`, `permissions`, `session`, and `eyedropper`. The legacy alias `drag` is still accepted and maps to `dnd`.

For Wayland drag-and-upload troubleshooting, start with:

```bash
CANVA_DEBUG=startup,dnd,upload,permissions,session flatpak run com.canva.WebApp
```

Current `1.4.8-dev.2` testing has already validated Linux Wayland startup, the fixed Home tab shell, the working custom eyedropper, and a real host-to-editor file drop on Wayland. The next checks remain the post-drop upload continuation, the host file picker path, and targeted OAuth popup completion retests.

## Compatibility notes

This Flatpak is intended to run across multiple Linux distributions and desktop environments, including KDE Plasma, GNOME, and other Wayland- or X11-based sessions. The shell now prefers Wayland where it is available while keeping a user override for X11 when troubleshooting is necessary.

## License

This project is distributed under the **GNU General Public License v3.0 or later**.

## References

Official documentation and reference projects used for architecture and packaging decisions:

- Flatpak introduction: https://docs.flatpak.org/en/latest/introduction.html
- Flatpak Electron guide: https://docs.flatpak.org/en/latest/electron.html
- Flatpak sandbox permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Flatpak builder reference: https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html
- Electron official documentation: https://www.electronjs.org/docs/latest/
- Canva Developers portal: https://www.canva.dev/docs/apps/
- Canva Connect authentication: https://www.canva.dev/docs/connect/authentication/
- Original Linux wrapper project: https://github.com/V8V88V8V88/canva-linux
- ltcode/eyedropper reference project: https://github.com/ltcodedev/eyedropper

## Notes

- The current release uses a `WebContentsView` shell instead of deprecated `BrowserView` APIs.
- The custom eyedropper works on both X11 and Wayland in current testing.
- This repository keeps a running `CHANGELOG.md` and short English code comments for the main shell logic.


## Wayland drag-and-drop diagnostics

Version 1.4.6 adds debug logging and safer permission handling for file uploads and drag-and-drop workflows on native Wayland sessions.
