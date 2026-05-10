# Shell helper classification

This document classifies the remaining shell helpers so transient migration
fallbacks do not return.

## c420ui host tool

- `scripts/sudo-common.sh` centralizes administrator validation and privileged
  command execution for the current repository layout. If c420ui is split into a
  package workspace, this helper should move to the host-tool location instead
  of being duplicated by dependent projects.

## Canva Linux recipes

These scripts are concrete Canva Linux packaging, validation, or build recipes
and may remain in the project:

- `scripts/build-appimage.sh`
- `scripts/build-flatpak-bundle.sh`
- `scripts/package-guidance-common.sh`
- `scripts/validate-project.sh`
- `scripts/validate-appimage.sh`
- `scripts/build-electron-dir.sh`

## Repository check helper

- `scripts/preflight-common.sh` is repository-check-only.

`preflight-common.sh` may provide only repository validation primitives such as:

- `require_command`
- `validate_json_file`
- `validate_package_scripts`
- `detect_package_version`
- `validate_package_version_semver`

It must not install, repair, or otherwise mutate npm dependencies. Build and
validation recipes may invoke `npm` commands directly after preflight checks.

## Obsolete

The old npm dependency bootstrap shell entrypoint is obsolete and must not be
reintroduced. Developers should run `npm ci --include=dev` explicitly when a
workspace is missing development dependencies.
