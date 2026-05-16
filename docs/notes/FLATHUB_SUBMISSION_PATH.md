# Flathub Submission Path (dev18)

## Objective

Keep local Canva Linux development/bundle workflow and Flathub submission workflow separate.

The local and Flathub-submission manifests must keep the same runtime permission policy unless a future patch documents a submission-specific exception.

- Local workflow (unchanged): repository-root `io.github.coletivo420.canva-linux.yml` + `./canva-linux-c420ui-builder`.
- Submission workflow (new path): `packaging/flathub/manifest.yml` + generated npm source manifest + submission scripts.

## Flathub submission requirements

Before preparing a Flathub submission, verify:

```bash
node -v
npm -v
flatpak --version
flatpak-builder --version
```

Required tools:

- Node.js >= 22
- npm
- flatpak
- org.flatpak.Builder runtime
- appstreamcli
- desktop-file-validate
- curl
- sha256sum
- tar

## Flow boundaries (dev18)

1. **Local development flow**: `./canva-linux-c420ui-builder --install-flatpak` builds as the current user, exports `repo/`, and installs from that local repo into the system Flatpak scope by default.
2. **GitHub release flow**: `./canva-linux-c420ui-builder --bundle-flatpak` exports `repo/` and then creates `.flatpak` via `flatpak build-bundle`.
3. **Flathub submission flow**: uses `packaging/flathub/manifest.yml` + generated sources + submission validation; `.flatpak` bundle generation is not part of the submission path.
