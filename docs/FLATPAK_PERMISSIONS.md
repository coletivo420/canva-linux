# Flatpak Permissions

## Overview

This document records the current `finish-args` in `com.canva.WebApp.yml` and explains why each permission exists in the `1.4.10-dev.7` Flathub validation cycle.

Goal for this pass:

- keep current runtime behavior stable;
- improve permission traceability for maintainers;
- prepare future Flathub review with clear, minimal-sandbox intent.

This remains a documentation and review pass, not a blind permission-removal pass. Broad home-directory access (`--filesystem=home`) remains absent in the current manifest.

## Current finish-args

Current manifest permissions:

- `--share=network`
- `--share=ipc`
- `--device=dri`
- `--socket=wayland`
- `--socket=fallback-x11`
- `--socket=pulseaudio`
- `--filesystem=xdg-run/pipewire-0`
- `--filesystem=xdg-data/fonts:ro`
- `--filesystem=~/.fonts:ro`
- `--filesystem=xdg-config/fontconfig:ro`
- `--filesystem=xdg-download`
- `--talk-name=org.freedesktop.FileManager1`
- `--talk-name=org.freedesktop.portal.Desktop`
- `--talk-name=org.freedesktop.ScreenSaver`
- `--talk-name=org.freedesktop.secrets`
- `--env=ELECTRON_TRASH=gio`
- `--env=XCURSOR_PATH=/run/host/user-share/icons:/run/host/share/icons`

## Required permissions

These are considered required for current behavior:

- `--share=network`: required for Canva web app and API traffic.
- `--share=ipc`: common Chromium/Electron runtime requirement.
- `--device=dri`: GPU acceleration support where host/runtime allow it.
- `--socket=wayland`: preferred Linux display path.
- `--socket=fallback-x11`: X11/XWayland fallback expected by Flathub lint guidance.
- `--socket=pulseaudio`: audio playback support.
- font read-only paths (`xdg-data/fonts`, `~/.fonts`, `xdg-config/fontconfig`): host font discovery.
- `--filesystem=xdg-download`: practical import/export path for common user workflows.
- `--talk-name=org.freedesktop.portal.Desktop`: portal integration baseline.

## Optional or review-needed permissions

These should be reviewed in future passes but are currently kept to avoid behavior regressions:

- `--filesystem=xdg-run/pipewire-0` (**under review**): may be optional depending on confirmed runtime media features.
- `--talk-name=org.freedesktop.FileManager1` (**review-needed**): used for desktop integration flows; verify if fully replaceable via portals.
- `--talk-name=org.freedesktop.ScreenSaver` (**review-needed**): keep until sleep/idle behavior is validated without it.
- `--talk-name=org.freedesktop.secrets` (**review-needed**): keep for current secret-service compatibility assumptions.

## Flathub lint considerations

Flathub lint and policy reviews typically flag broad permissions such as:

- arbitrary `--socket=session-bus` or `--socket=system-bus`;
- broad host filesystem access (`home`, `host`) without clear justification;
- missing `fallback-x11` when `wayland` is used.

Current manifest state for this repo:

- does **not** use broad session/system bus sockets;
- includes `wayland` plus `fallback-x11`;
- removes broad home-directory filesystem access and relies on portals + narrower paths.

## Known limitations

- Permission minimization is constrained by real Canva web import/export behavior inside sandboxed Electron.
- Desktop environment differences (Wayland/X11/XWayland, compositor, portals) can affect which permissions are truly removable.
- This cycle intentionally does not change native OAuth popup icon behavior on Linux/Wayland.

## Local GitHub bundle vs future Flathub packaging

- Local GitHub workflow builds `dist/canva-webapp-linux-$VERSION.flatpak` from this repo.
- Future Flathub submission is a separate review process in `flathub/flathub` with policy and lint scrutiny.
- A permission accepted for local testing may still require tightening for Flathub acceptance.

## Future review checklist

Before changing manifest permissions:

1. Run `./scripts/validate-flatpak.sh`.
2. Validate upload/import/export flows in real sandbox sessions.
3. Prefer narrowing broad filesystem permissions incrementally.
4. Re-run Flathub lint checks after each permission change.
5. Record rationale in this document and `CHANGELOG.md`.

## Flathub preparation status tie-in

- Permission intent is documented and should stay minimal for reviewer trust.
- GitHub `.flatpak` bundle release and Flathub submission remain separate processes.
- Current non-permission blockers are final Flathub submission/review work and OAuth provider validation beyond Google.


## Portal-first file access

The manifest prefers Flatpak portal-based file access for uploads/downloads where possible.
Broad home-directory access is intentionally avoided for Flathub readiness.


## OAuth validation scope

Google OAuth remains maintainer-tested. Other OAuth providers use the same generalized popup flow but remain community-tested pending broader user feedback.
