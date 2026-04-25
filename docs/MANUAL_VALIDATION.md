# Manual Validation — 1.4.10-dev.8

This document defines the manual validation routine for the current development cycle.

## Validation scope

`1.4.10-dev.8` is a Flathub-readiness and maintainability pass that also restores the custom eyedropper after the preload modularization regression.

Expected outcome:

- user-facing runtime behavior remains stable
- internal module boundaries and debug logging are easier to inspect
- the Canva editor loads the generated single-file preload bundle and keeps the custom `ltcodedev/eyedropper` path active

## Environment preparation

1. Use the current local branch build.
2. Ensure the Flatpak package installs and launches successfully.
3. Keep terminal logs visible when running with `CANVA_DEBUG` filters.
4. Before starting from source, run `npm run build:preload` or use `npm start` / `npm run dist`, which run it automatically.
5. When debugging startup or preload behavior, inspect the generated `current.log` under the Electron user-data logs directory.

## Baseline startup checks

1. Launch normally:
   - `flatpak run com.canva.WebApp`
2. Launch with startup diagnostics:
   - `CANVA_DEBUG=startup,eyedropper flatpak run com.canva.WebApp`
3. Confirm the app window renders and loads Canva.
4. Confirm a fresh `current.log` is created for this run.
5. Confirm startup logs include the Canva preload reaching `modules-loaded` and `eyedropper-installed`.

## Home tab and toolbar behavior

1. Confirm Home tab is present at startup.
2. Attempt to close Home tab and confirm it remains protected.
3. Create, switch, and close non-home tabs.
4. Click Home from another tab and confirm focus returns to the existing Home tab.

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

## Eyedropper behavior

1. Trigger the Canva eyedropper flow.
2. Confirm the bundled `ltcodedev/eyedropper` custom picker opens.
3. Confirm logs show the wrapper intercepting `EyeDropper.open()` without `module-load-failed` entries for `./debug`, `custom-eyedropper-flow`, or `native-eyedropper-wrapper`.
4. Confirm `Escape` aborts the picker cleanly.
5. Confirm a picked color resolves back to Canva without leaving stale overlay UI.
6. Confirm the flow does not fall back to a native browser/system color picker or a screen-capture picker window.

## Wayland/X11 mode sanity

1. Default startup:
   - `flatpak run com.canva.WebApp`
2. Forced Wayland:
   - `CANVA_FORCE_WAYLAND=1 flatpak run com.canva.WebApp`
3. Forced X11:
   - `CANVA_FORCE_X11=1 flatpak run com.canva.WebApp`

## Logging review

1. Confirm terminal debug entries include the expected source prefix, such as `main`, `canva-preload`, or `toolbar-preload`.
2. Confirm the file-backed debug log contains the same run and does not include stale content from a previous launch.

Record observable regressions only; do not treat internal module reshaping as a user-facing behavior change by itself.
