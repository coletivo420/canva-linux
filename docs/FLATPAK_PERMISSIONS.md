# Flatpak Permissions (dev18)

## Dev18 objective

`1.4.10-dev.18` is a sandbox consolidation and justification phase.

This is **not** an aggressive permission-pruning pass. The goal is to preserve a functional Canva Linux runtime (login persistence, upload/export, video/audio workflows, webcam/microphone compatibility, and desktop integration) while removing only permissions without a strong functional rationale.

## Portal-first policy

Canva Linux remains **portal-first** for user-selected file access and desktop mediation.

- Keep narrow, workflow-driven permissions.
- Do not add broad filesystem or broad bus access without explicit maintainer approval.
- Keep media compatibility paths (PulseAudio/PipeWire) aligned with Chromium/Electron runtime needs.
- Treat explicit `--talk-name=org.freedesktop.portal.Desktop` as forbidden unless a concrete technical requirement is documented.

## Runtime permission baseline (must match in both manifests)

Current policy for both `io.github.coletivo420.canva-linux.yml` and `packaging/flathub/manifest.yml`:

```yaml
finish-args:
  - --share=network
  - --share=ipc
  - --device=dri
  - --socket=wayland
  - --socket=fallback-x11
  - --socket=pulseaudio
  - --filesystem=xdg-run/pipewire-0
  - --filesystem=xdg-download
  - --talk-name=org.freedesktop.FileManager1
  - --talk-name=org.freedesktop.secrets
  - --env=ELECTRON_TRASH=gio
  - --env=XCURSOR_PATH=/run/host/user-share/icons:/run/host/share/icons
```

## Permission decision table

| Permission | Decision | Functional reason | Validation flow |
|---|---|---|---|
| `--share=network` | keep | Canva web/API access for login, editor sync, assets, upload/export APIs | app load, login, editor |
| `--share=ipc` | keep | Electron/Chromium runtime stability, especially with X11/XWayland fallback | app launch, Wayland/X11 fallback |
| `--device=dri` | keep | GPU/WebGL/video acceleration for canvas/editor/video flows | editor rendering, video playback |
| `--socket=wayland` | keep | native Wayland display support | Wayland launch |
| `--socket=fallback-x11` | keep | X11/XWayland fallback compatibility | X11 fallback launch |
| `--socket=pulseaudio` | keep | audio playback + microphone compatibility in multimedia flows | video/audio preview, voice recording |
| `--talk-name=org.freedesktop.secrets` | keep | secure credential/session integration via Secret Service | OAuth, restart session |
| `--filesystem=xdg-download` | keep | narrow export/download path for generated files | PNG/PDF/MP4 export |
| `--filesystem=xdg-run/pipewire-0` | keep | PipeWire compatibility for webcam/screencast/WebRTC flows (portal-first) | webcam/screen recorder |
| `--talk-name=org.freedesktop.FileManager1` | keep | desktop file-manager integration (open export/download location) | open/export location |
| `--talk-name=org.freedesktop.ScreenSaver` | remove | no required direct runtime dependency confirmed | long playback smoke |
| `--filesystem=home` | forbidden | broad filesystem access not required | ensure absent |
| `--device=all` | forbidden | broad device access not required | ensure absent |
| `--socket=session-bus` | forbidden | broad D-Bus access not required | ensure absent |
| `--socket=system-bus` | forbidden | broad system-bus access not required | ensure absent |
| `--talk-name=org.freedesktop.portal.Desktop` | forbidden | explicit portal bus access not required | ensure absent |

## Functional rationale by Canva workflow

- **Login/session persistence**: requires `--share=network` + `--talk-name=org.freedesktop.secrets`.
- **Editor rendering/video performance**: requires `--device=dri` + display sockets.
- **Upload/export flows**: portal-first access with `--filesystem=xdg-download` for practical output handling.
- **Audio/video/media creation**: `--socket=pulseaudio` and `--filesystem=xdg-run/pipewire-0` preserved for compatibility.
- **Desktop integration**: `--talk-name=org.freedesktop.FileManager1` kept for open-location interactions.

## Minimal manual validation checklist (dev18)

After permission updates, run at minimum:

- app launch
- Google/OAuth login
- restart-session persistence
- image/video upload
- PNG/JPG/PDF and MP4 export
- video/audio playback
- microphone/webcam/screen-recorder flows where available
- custom eyedropper flow
- no new runtime error tied to ScreenSaver permission removal

Optional session-storage diagnostic:

```bash
flatpak run io.github.coletivo420.canva-linux --canva-debug=1
```

## Guardrails

Do not add these without explicit maintainer approval and documented rationale:

- `--filesystem=home`
- `--device=all`
- `--socket=session-bus`
- `--socket=system-bus`
- `--talk-name=org.freedesktop.portal.Desktop`
