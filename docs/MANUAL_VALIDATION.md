# Manual Validation — 1.4.8-dev.X

This document defines a lightweight manual validation routine for non-functional DEV maintenance patches.

## Environment preparation

1. Use the current local branch build.
2. Ensure the Flatpak package installs and launches successfully.
3. Keep terminal logs visible when running with `CANVA_DEBUG` filters.

## Baseline startup checks

1. Launch normally:
   - `flatpak run com.canva.WebApp`
2. Launch with startup diagnostics:
   - `CANVA_DEBUG=startup flatpak run com.canva.WebApp`
3. Confirm the app window renders and loads Canva.

## Home tab behavior

1. Confirm Home tab is present at startup.
2. Attempt to close Home tab and confirm it remains protected.
3. Click Home from another tab and confirm focus returns to the existing Home tab.

## OAuth popup flow

1. Trigger a Canva sign-in/provider flow that opens an OAuth popup.
2. Confirm popup opens and can complete authentication path.
3. Confirm popup close/redirect behavior returns control to the main app.

> Note: Native Linux/Wayland OAuth popup icon customization remains a known limitation and is not validated as a release gate in this cycle.

## File ingress and upload observability

1. Drag and drop a test asset into Canva.
2. Use the file picker from Canva upload flow.
3. Paste clipboard content if applicable.
4. When troubleshooting, run:
   - `CANVA_DEBUG=dnd,upload,permissions,session flatpak run com.canva.WebApp`

## Wayland/X11 mode sanity

1. Default startup:
   - `flatpak run com.canva.WebApp`
2. Forced Wayland:
   - `CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp`
3. Forced X11:
   - `CANVA_FORCE_X11=1 flatpak run com.canva.WebApp`

Record observable regressions only; do not introduce functional fixes in a documentation-only DEV patch.
