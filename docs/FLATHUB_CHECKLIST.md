# Flathub Submission Checklist

Use this checklist before opening or updating a Flathub submission PR.

## Metadata validation

- [ ] Run AppStream validation:
  - `appstreamcli validate --explain data/com.canva.WebApp.metainfo.xml`
- [ ] Run desktop file validation:
  - `desktop-file-validate data/com.canva.WebApp.desktop`

## Flatpak linting

- [ ] Run manifest lint:
  - `flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml`
- [ ] Run repo lint:
  - `flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo`

## Screenshot review

- [ ] Confirm screenshot URLs are stable and publicly accessible.
- [ ] Confirm screenshot URLs do not point to temporary branch paths.
- [ ] Confirm screenshots represent real app behavior and current UI.

## Permission review

- [ ] Review manifest permissions and rationale.
- [ ] Ensure `docs/FLATPAK_PERMISSIONS.md` reflects the current manifest.

## OAuth support note

- [ ] Ensure docs reflect tested OAuth status (Google tested; other providers community-tested unless explicitly validated).

## Release workflow separation

- [ ] Confirm GitHub release bundle workflow remains separate from Flathub submission workflow.
- [ ] Confirm local bundle generation (`./canva-linux.sh --bundle`) is treated as release artifact creation, not Flathub submission.

## Source and release requirements

- [ ] Ensure Flathub source references a stable tag or release source.
- [ ] Ensure referenced source is reproducible and permanently available.

## Final maintainer review

- [ ] Perform a final manual maintainer review of metadata, screenshots, permissions, and submission notes before opening/updating Flathub PR.
