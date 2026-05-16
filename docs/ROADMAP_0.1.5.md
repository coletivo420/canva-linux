# Canva Linux 0.1.5.x Roadmap

The `0.1.5.x` line is a stabilization and visual-alignment line.

It must prepare Canva Linux for the later `0.1.6.devX` packaging work by making the app feel stable, polished and visually closer to Canva for Windows before any new distribution format is added.

## Strategic goal

```text
0.1.5.x = stability + visual parity
```

Primary goals:

- improve runtime stability;
- align the visible shell with Canva for Windows where practical;
- keep the Flatpak workflow reliable;
- preserve the current TypeScript migration and CL-EyeDropper roadmap;
- avoid large architecture changes;
- avoid adding new package formats in this line.

## Non-goals

The `0.1.5.x` line must not introduce:

- AppImage packaging;
- DEB/RPM/AUR packaging;
- PackageKit/pkgkit support;
- Snap packaging;
- `.run` installers;
- large runtime rewrites;
- CL-EyeDropper implementation work before its planned TypeScript phase.

## 0.1.5.dev1 — visual audit

Create a practical visual comparison between Canva Linux and Canva for Windows.

Deliverables:

- document shell/window differences;
- review initial window size and background;
- review icon, desktop name and title behavior;
- review toolbar spacing, contrast and active states;
- review dark/light behavior;
- document gaps in `docs/VISUAL_PARITY.md` if a dedicated file is needed.

## 0.1.5.dev2 — shell/window polish

Focus on the visible Electron shell.

Deliverables:

- refine initial window dimensions when needed;
- preserve `StartupWMClass` and app-id behavior;
- keep background color consistent with the current theme;
- check taskbar/dock integration;
- avoid changing Flatpak permissions or app-id.

## 0.1.5.dev3 — toolbar and tab polish

Focus on the custom toolbar and tab shell.

Deliverables:

- review toolbar height and spacing;
- review tab title rendering;
- review active/inactive tab states;
- preserve toolbar state broadcasting;
- preserve WebContentsView tab behavior;
- preserve OAuth popup separation from normal tabs.

## 0.1.5.dev4 — Flatpak workflow stability

Focus on install, dev-run and bundle reliability.

Deliverables:

- keep `CANVA_FLATPAK_SCOPE=system` as the default;
- keep `CANVA_FLATPAK_SCOPE=user` as explicit opt-in;
- keep `flatpak-builder` running as the current user, never with `sudo`;
- preserve artifact ownership restoration for `build-dir`, `repo` and `.flatpak-builder`;
- validate --install-flatpak, --bundle-flatpak, --uninstall and --reset-user-data.

## 0.1.5.dev5 — debug/log support polish

Focus on user-support diagnostics.

Deliverables:

- preserve `canva-linux --debug=1` and `canva-linux --debug=2` as the only public debug modes;
- preserve central `logs/current.log` behavior;
- review post-install guidance wording;
- keep GPU, OAuth, upload, drag-and-drop and EyeDropper diagnostics visible in internal logs;
- update `docs/DEBUGGING.md` if behavior changes.

## 0.1.5.dev6 — functional stability pass

Run a user-facing stability pass.

Checklist:

- app launch;
- login/session persistence;
- OAuth popup flow;
- tabs and toolbar;
- upload;
- paste;
- drag-and-drop;
- file picker;
- current LTCode-based EyeDropper flow;
- GPU diagnostics;
- Wayland;
- X11 when available;
- Flatpak install, run, bundle, uninstall and reset flows.

## 0.1.5 final criteria

The line can close when:

- the app is visually polished enough for the next packaging line;
- Flatpak local workflows are stable;
- validation passes;
- support/debug docs are current;
- no packaging factory work leaked into the stabilization line;
- `CHANGELOG.md`, README and roadmap docs are aligned.

## Handoff to 0.1.6.devX

After `0.1.5.x`, the `0.1.6.devX` line may start AppImage and package-factory groundwork.

`0.1.5.x` must leave the app stable enough that `0.1.6.devX` can focus on release artifacts instead of runtime repair.
