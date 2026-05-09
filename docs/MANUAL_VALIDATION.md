# Manual Validation — 0.1.4-12

This document defines the manual validation routine for the current release.

## Validation scope

`0.1.4-12` validates the current Canva Linux runtime, c420ui,
packaging, and CL-EyeDropper behavior.

Expected outcome:

- user-facing runtime behavior remains stable;
- c420ui and direct CLI actions share the same action registry behavior;
- privileged actions follow the root/sudo policy;
- maintained Node.js logic remains TypeScript-first;
- the Canva editor loads the generated single-file preload bundle and keeps the
  CL-EyeDropper path active.

## Environment preparation

1. Use the current local branch build.
2. Install dependencies with `npm ci` if `node_modules` is absent or stale.
3. Build runtime assets with `npm run build:runtime` before package/runtime checks.
4. Keep terminal logs visible when validating debug modes.
5. When debugging startup or preload behavior, inspect the generated `current.log`
   under the Electron user-data logs directory.

## Automated baseline before manual checks

Run the automated project checks before manual validation:

```sh
npm run validate
```

If runtime artifacts are missing, run:

```sh
npm run build:runtime
npm run validate
```

Do not remove or weaken validation checks to make the command pass.

## c420ui validation

1. Launch c420ui as a regular user:
   - `./canva-linux.sh`
2. Confirm the interface uses c420ui as the user-facing terminal interface name.
3. Confirm the install detection/status overview is visible at the top.
4. Confirm actions are loaded from `scripts/actions.json`.
5. Confirm keyboard navigation, focus highlights, settings, log copy, and text
   selection behavior match `docs/FEATURES.md` and `docs/DEBUGGING.md`.
6. Confirm c420ui is not launched or recommended as root.

## Planned exit validation

1. Trigger a planned action path that should return exit code `78`.
2. Confirm direct CLI and c420ui report the planned exit as planned/canceled rather
   than success.
3. Confirm c420ui blocks concurrent action execution while an action is running.
4. Confirm direct CLI and c420ui expose equivalent behavior for the same action.

## Root policy validation

1. Start the tool as a regular user.
2. Confirm system-wide actions request authentication only when needed.
3. Confirm user-scope actions never call sudo.
4. Confirm system-wide actions use the shared sudo helper contract.
5. Confirm `./canva-linux.sh` is not run with `sudo` or as root.
6. Confirm sudo/root authentication failures appear in c420ui without logging
   password material.

## TypeScript-first validation

1. Confirm maintained Node.js logic is TypeScript source.
2. Confirm no maintained JavaScript source is added outside allowed generated or
   dependency directories.
3. Run the TypeScript-first policy checks through `npm run validate`.
4. Confirm shell remains limited to Linux host-operation glue.

## Native and Flatpak system/user validation

1. Validate native install actions for both `system` and `user` scopes.
2. Validate Flatpak install actions for both `system` and `user` scopes.
3. Confirm Flatpak user scope shows the duplication warning.
4. Confirm install detection updates after native and Flatpak install/purge flows.
5. Confirm c420ui and direct CLI agree on available scopes and action outcomes.

## AppImage validation

1. Build or obtain the AppImage artifact for the current version.
2. Confirm the AppImage filename and checksum entries preserve the generated
   architecture string, such as `x86_64` or `X86_64`.
3. Launch the AppImage as a regular user.
4. Confirm Canva loads and the generated preload bundle is active.
5. Confirm AppImage FUSE guidance remains accurate when FUSE support is missing.

## Baseline startup checks

1. Launch normally:
   - `flatpak run io.github.coletivo420.canva-linux`
2. Launch with startup diagnostics:
   - `CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux`
3. Launch with verbose diagnostics:
   - `CANVA_DEBUG=2 flatpak run io.github.coletivo420.canva-linux`
4. Confirm the app window renders and loads Canva.
5. Confirm a fresh `current.log` is created for each debug run.
6. Confirm debug logs do not include passwords, sudo stdin, cookies, tokens, or
   credential material.

## Home tab and toolbar behavior

1. Confirm Home tab is present at startup.
2. Attempt to close Home tab and confirm it remains protected.
3. Create, switch, and close non-home tabs.
4. Click Home from another tab and confirm focus returns to the existing Home tab.

## OAuth popup flow

1. Trigger a Canva sign-in/provider flow that opens an OAuth popup.
2. Confirm popup opens and can complete authentication path.
3. Confirm popup close/redirect behavior returns control to the main app.

> Note: Native Linux/Wayland OAuth popup icon customization remains a known
> limitation and is not validated as a release gate in this cycle.

## File ingress and upload observability

1. Drag and drop a test asset into Canva.
2. Use the file picker from Canva upload flow.
3. Paste clipboard content if applicable.
4. When troubleshooting, rerun with `CANVA_DEBUG=1` and then `CANVA_DEBUG=2` to
   compare startup and verbose diagnostics.

## CL-EyeDropper validation

1. Trigger the Canva eyedropper flow.
2. Confirm the CL-EyeDropper custom picker opens.
3. Confirm logs show the wrapper intercepting `EyeDropper.open()` without
   `module-load-failed` entries for `./debug`, `custom-eyedropper-flow`, or
   `native-eyedropper-wrapper`.
4. Confirm `Escape` aborts the picker cleanly.
5. Confirm a picked color resolves back to Canva without leaving stale overlay UI.
6. Confirm the flow does not fall back to a native browser/system color picker or
   a screen-capture picker window.

## Wayland/X11 mode sanity

1. Default startup:
   - `flatpak run io.github.coletivo420.canva-linux`
2. Forced Wayland:
   - `CANVA_FORCE_WAYLAND=1 flatpak run io.github.coletivo420.canva-linux`
3. Forced X11:
   - `CANVA_FORCE_X11=1 flatpak run io.github.coletivo420.canva-linux`

## Logging review

1. Confirm terminal debug entries include the expected source prefix, such as
   `main`, `canva-preload`, or `toolbar-preload`.
2. Confirm the file-backed debug log contains the same run and does not include
   stale content from a previous launch.
3. Confirm `CANVA_DEBUG=1` produces startup/runtime diagnostics appropriate for
   normal troubleshooting.
4. Confirm `CANVA_DEBUG=2` produces verbose diagnostics without leaking
   credential material.

## Bluetooth/Floss runtime-noise check

1. Run:
   - `CANVA_DEBUG=1 flatpak run io.github.coletivo420.canva-linux 2>&1 | grep -Ei 'floss|bluetooth|bluez'`
2. Confirm Floss manager warnings are reduced compared with previous builds.
3. Treat remaining Bluetooth-related lines as diagnostics unless they are tied to
   a user-facing regression.

Record observable regressions only; do not treat internal module reshaping as a
user-facing behavior change by itself.
