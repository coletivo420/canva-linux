# Screenshot manifest

This manifest documents the real screenshot files currently staged in `assets/screenshots/` for AppStream metadata and future Flathub submission review.

## Current files

- `eyedropper.png`
- `home.png`
- `tabs.png`
- `upload.png`
- `windowpopup.png`

## AppStream order

1. `home.png` - primary/default screenshot
2. `tabs.png` - tabbed shell overview
3. `upload.png` - upload workflow
4. `eyedropper.png` - custom eyedropper workflow

## Privacy review status

- The staged screenshots are intended to be real local captures reviewed for public metadata use.
- Screenshots must avoid private account data, personal identifiers, tokens, private projects, and personal files.
- Review the committed images again before any Flathub submission.

## Notes

- `windowpopup.png` is supporting documentation material and not the primary Flathub screenshot.
- `editor.png` is intentionally not required.
- Screenshot URLs used in AppStream metadata must remain pinned to a commit SHA or stable release/tag.
- Branch URLs must not be used for screenshot metadata.
