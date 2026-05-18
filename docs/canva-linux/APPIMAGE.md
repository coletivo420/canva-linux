# Canva Linux AppImage

Canva Linux is the dependent project for this package target; c420ui is the
engine that exposes the workflow and enforces generic action policy.

Canva Linux provides the AppImage recipe. c420ui exposes and runs the related
actions through the generic artifact workflow system.

## Controls

- AppImage build script invocation.
- Discovery of the generated AppImage file name.
- Preservation of AppImage artifact names resolved from recipe `outputPattern` values.
- AppImage-specific checksum generation.
- Documentation of host requirements such as FUSE.

## Must not control

- Generic artifact recipe validation.
- Generic planned-action, dry-run, confirmation, or root policy.
- Architecture renaming from generated names to `x64`.

## Implementing files

- `packages/c420ui/scripts/build-appimage.sh`
- `scripts/validate-appimage.sh`
- `config/canva-linux/artifacts.json`
- `scripts/c420ui-adapter/artifacts.ts`
- `docs/APPIMAGE_FUSE.md`

## c420ui interaction

The AppImage workflow is declared in `config/canva-linux/artifacts.json` and
loaded through the Canva Linux adapter. c420ui validates the recipe and routes
execution through the Action Engine and Command Runner.

## Boundary checks

- `npm run check:canva-linux`
- `npm run check:c420ui-core`
- `./scripts/validate-project.sh`

## Forbidden regressions

- Do not hardcode `-x64.AppImage`.
- Do not create the complete release `SHA256SUMS` manifest in the AppImage build
  script.
- Do not change AppImage runtime behavior as part of documentation work.
