# Screenshots planning

This file tracks the real screenshot set prepared for AppStream metadata and future Flathub submission review.

## Current status

- Flathub requires real screenshots.
- Screenshots are real local captures staged in `assets/screenshots/`.
- AppStream metadata now references the active screenshot set with stable direct URLs pinned to a commit SHA.
- Branch URLs must not be used for screenshot metadata.
- The current screenshot set should still be reviewed before Flathub submission.
- Locally generated OSTree repos do not mirror screenshots to `dl.flathub.org/media`; that mirror step belongs to Flathub infrastructure during submission review.

## Selected screenshot set

- `home.png` - Home screen
- `tabs.png` - Toolbar and tabs
- `upload.png` - Upload or picker flow
- `eyedropper.png` - Eyedropper flow
- `windowpopup.png` - Separate window and popup flow for documentation/supporting material

`home.png` is the primary/default AppStream screenshot.

Active AppStream order:

1. `home.png`
2. `tabs.png`
3. `upload.png`
4. `eyedropper.png`

`windowpopup.png` is useful for documentation and support material, but it is not the primary Flathub screenshot and is not part of the active AppStream screenshot list.

`editor.png` is intentionally not required.

## Capture policy for future release screenshots

- Use a clean demo Canva account and non-private demo projects.
- Prefer PNG format.
- Prefer 16:9 captures.
- Capture the app window only when possible.
- Avoid emails, avatars, tokens, personal files, private projects, and other private account data.
- Do not commit fake or placeholder screenshots.

## AppStream/MetaInfo policy

- Use only real screenshots already committed in the repository.
- Use stable direct screenshot URLs pinned to a commit SHA or stable release/tag.
- Do not use branch URLs for screenshot metadata.
- Do not publish placeholder or fake screenshots.
- Keep GitHub release bundle publication and Flathub submission as separate workflows.

## Submission constraints

- Real screenshots are mandatory before Flathub submission.
- Screenshots must not expose private account data, private project content, or personal identifiers.
- Active AppStream screenshot URLs must remain stable and review-ready.
- Local repo lint screenshot mirror findings are expected until Flathub mirrors accepted screenshots.

## OAuth and popup notes for screenshots

- Google OAuth was tested during this cycle.
- Facebook/Meta, Apple, and Microsoft OAuth still require manual validation.
- Native OAuth provider icons remain unsupported.
- Normal Canva content stays in tabs; only OAuth/authentication flows may open popup windows.
