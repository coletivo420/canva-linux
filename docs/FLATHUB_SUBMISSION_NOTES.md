# Flathub Submission Notes (dev16)

## Policy context: risk of "simple web wrapper"

Flathub policy rejects **simple web wrappers** that only embed a web engine and load a remote website without meaningful desktop behavior.

This app is web-based, but the desktop package includes non-trivial Linux/Electron behavior beyond a trivial wrapper.

## Functional rationale (non-trivial behavior)

### 1) Persistent authenticated desktop session

- The app uses a persistent Electron partition (`persist:canva`) so login/session state survives restarts.
- This is intentional desktop-session behavior, not stateless kiosk-style URL loading.

### 2) Internal tab model for Canva flows

- Navigation is routed through an internal tab controller instead of opening arbitrary external Electron windows for normal Canva usage.
- OAuth windows are scoped separately from normal content windows by policy.

### 3) OAuth popup support with explicit handling

- OAuth provider popups are handled via explicit main-process logic and shared session partitioning.
- This enables practical account sign-in flows expected by desktop users.

### 4) Desktop integration and runtime behavior

- Wayland/X11 behavior is curated for Linux desktop compatibility.
- Flatpak permissions are intentionally narrowed and documented.
- Desktop metadata, launcher integration, and portal-centric behavior are maintained as reviewed package behavior.

### 5) Custom eyedropper integration (bundled picker path)

- The package includes a maintained custom eyedropper path (bundled preload/picker integration), not only default browser behavior.
- Preload bundling and runtime wiring are kept as explicit package-maintained functionality.

## Submission-path reproducibility rationale

The dedicated submission path ensures Flathub review sees reproducible, auditable inputs:

- pinned app source archive (`type: archive` + `sha256`);
- pinned npm dependency inputs (`generated-sources.json`);
- offline npm installation path in sandbox (`npm install --offline`);
- dedicated preparation/validation scripts for submission artifacts.

## Maintainer references

- `docs/FLATHUB_SUBMISSION_PATH.md`
- `docs/FLATHUB_CHECKLIST.md`
- `docs/FLATHUB_SOURCE.md`
- `docs/TECHNICAL.md`
