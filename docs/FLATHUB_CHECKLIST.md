# Flathub Submission Checklist

Use this checklist before opening or updating a Flathub submission PR.

## Flathub validation checklist

- [ ] AppStream validation
- [ ] Desktop file validation
- [ ] Manifest lint
- [ ] Repo lint
- [ ] Screenshot URL review
- [ ] Permission review
- [ ] Local install smoke test
- [ ] Bundle generation test
- [ ] Maintainer final review

## Command examples

```bash
./canva-linux.sh --validate
./canva-linux.sh --bundle
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.canva.WebApp.yml
flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo
```

## Notes

- Flathub validation commonly expects both manifest lint and repo lint checks.
- If `org.flatpak.Builder` is missing locally, install it with:
  `flatpak install flathub org.flatpak.Builder`
- Keep OAuth status explicit in submission notes: Google OAuth is maintainer-tested; other OAuth providers remain community-tested.
- Final Flathub submission should happen only after maintainer review of lint output, permissions, screenshots, and release source.
