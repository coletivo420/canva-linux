# Shell Helper Classification

This repository keeps shell helpers only when they have a concrete host or
repository-check boundary. Removed bootstrap fallbacks must not be restored.

## c420ui host tool

- `packages/c420ui/host/linux/sudo-helper.sh` is a reusable c420ui Linux host
  tool. It owns generic sudo stdin validation and privileged command execution
  for the Linux root provider base.

## Canva Linux recipes

These scripts are concrete Canva Linux recipes and may remain project-local:

- `scripts/build-appimage.sh`
- `scripts/build-flatpak-bundle.sh`
- `scripts/package-guidance-common.sh`
- `scripts/validate-project.sh`
- `scripts/validate-appimage.sh`
- `scripts/build-electron-dir.sh`
- `scripts/build-runtime.sh`
- `scripts/install-flatpak-local.sh`
- `scripts/validate-flatpak.sh`
- `scripts/validate-flathub-submission.sh`

They may run concrete build, package, validation, and guidance commands, but
must not duplicate c420ui Action Engine policy for planned actions, dry-runs,
root handling, or confirmation.

## Repository check helper

- `scripts/preflight-common.sh` is repository-check-only. It may expose shared
  checks such as `require_command`, `validate_json_file`,
  `detect_package_version`, and `validate_package_version_semver`.

All listed helpers are used by active validation or packaging scripts; remove a helper from this file and from `scripts/preflight-common.sh` if it loses its last active caller.

It must not own npm install policy, dependency repair policy, or bootstrap fallbacks.

## Obsolete

- `scripts/ensure-npm-dependencies.sh` is obsolete and must not exist.
