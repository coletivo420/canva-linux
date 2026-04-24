# Flathub Submission Checklist

Use this checklist before opening or updating a Flathub submission PR.

- [ ] AppStream validation
  - `appstreamcli validate --explain data/com.canva.WebApp.metainfo.xml`
- [ ] Desktop validation
  - `desktop-file-validate data/com.canva.WebApp.desktop`
- [ ] Flatpak lint
  - `flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml`
  - `flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo`
- [ ] Permissions review
  - Confirm manifest permissions match `docs/FLATPAK_PERMISSIONS.md`.
- [ ] Screenshots check
  - Confirm screenshot URLs are stable, public, and reflect current behavior.
- [ ] OAuth note
  - Keep OAuth status explicit (Google validated; other providers community-tested unless revalidated).
- [ ] Stable release source
  - Flathub submission must reference a stable, reproducible release source.
- [ ] Manual review
  - Perform final maintainer review before opening/updating Flathub PR.
