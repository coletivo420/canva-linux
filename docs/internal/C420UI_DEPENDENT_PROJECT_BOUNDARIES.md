# C420UI dependent project boundaries

C420UI must remain reusable across dependent projects. Dependent project code may
provide metadata, action definitions, and concrete command adapters, but it must
not duplicate C420UI policy decisions.

## Action Engine ownership

- Dependent project adapters execute concrete commands only after the c420ui
  Action Engine has applied planned/dry-run/root/confirmation policy.
- Project adapters must not duplicate Action Engine policy.
- Planned actions are metadata-only until the Action Engine decides otherwise.
- Dry-run behavior belongs to the Action Engine and must not be reimplemented in
  command runners or project adapters.
- Root and confirmation policy belongs to the Action Engine before command
  execution begins.

## Repository checks

- `scripts/preflight-common.sh` is repository-check-only.
- It may validate commands, JSON, package scripts, and package version format.
- It must not install, repair, or mutate npm dependencies.
