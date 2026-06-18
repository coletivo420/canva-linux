# Dev12 Rust c420ui Migration

## Status

Phase 4 in progress.

## Goal

Dev12 moves c420ui host, filesystem, process and terminal ownership toward Rust
without moving Canva Linux runtime code.

The boundary remains:

- Canva Linux declares project identity, paths and policy.
- c420ui validates and orchestrates generic workflows.
- c420ui-host executes host filesystem and process primitives.
- c420ui-tui becomes the direct terminal UI migration target after operational cleanup.

## Permanent Boundary

Canva Linux remains ESM/TypeScript for:

- Electron main process
- Electron preload
- toolbar
- tabs
- CLeyedropper integration
- Canva Linux adapter
- build metadata policy
- packaging policy
- project-specific validation
- Flatpak/AppImage/native integration policy

Rust must not hardcode Canva Linux identity, app id, Flatpak id, executable
name, install paths, metadata paths, artifact naming policy or packaging policy.

Rust must not touch Canva Linux runtime, Electron, toolbar, tabs or
CLeyedropper code.

## Roadmap

### Phase 1 - Rust Operational Engine

Build the generic Rust host foundation:

- JSON command contracts
- host dependency probes
- command availability checks
- safe process execution
- sudo validation
- maintenance primitives
- Rust boundary checks

TypeScript still owns the c420ui terminal UI in this phase.

### Phase 2 - Remove Remaining TypeScript Operational Filesystem

Move mutable operational filesystem work out of TypeScript:

- install copy/remove/symlink/chmod/write operations
- icon installation
- linux-unpacked normalization
- AppImage cleanup/find/checksum sidecars
- Flatpak bundle sidecars where practical
- preflight command checks

Dependent projects declare install identity and paths in their own config.
c420ui validates and orders work. c420ui-host performs safe filesystem and
process operations.

TypeScript still owns the c420ui terminal UI in this phase.

### Phase 3 - Final Rust TUI Contracts

Define the final c420ui-tui contracts before migration:

- terminal event model
- action rendering contract
- root prompt contract
- log rendering contract
- workflow progress contract
- settings/state persistence boundary
- TypeScript adapter boundary

There is no experimental backend and no optional TypeScript/Rust toggle.
The `c420ui-tui` binary is introduced in this phase as the direct migration
target. It starts with JSON doctor/render smoke contracts only; the TypeScript
terminal UI remains wired until direct replacement.

### Phase 4 - Direct c420ui-tui Migration

Move the c420ui terminal UI directly to Rust under the c420ui boundary.

The TypeScript side keeps project adapters, workflow declarations and Canva
Linux-specific policy. Rust owns the terminal rendering and interaction.
`runC420UITerminalApp()` now routes through `c420ui-tui run --json-lines` as
the official terminal runtime.

### Phase 5 - Remove TypeScript TUI and Close Dev12

Remove the old TypeScript terminal UI after c420ui-tui is complete and covered
by contracts. Close Dev12 once c420ui host operations and terminal UI ownership
are cleanly split from dependent project policy.

## Active Rust Layout

```text
build-resources/c420ui-rs/
  Cargo.toml
  src/bin/c420ui-host.rs
  src/bin/c420ui-tui.rs
  src/lib.rs
  src/commands/
  src/host/
  src/tui/
  tests/
```

## Active Commands

```text
c420ui-host --version
c420ui-host doctor --json
c420ui-host host-info --json
c420ui-host check-host-dependencies --json
c420ui-host run-process --json-lines
c420ui-host fix-permissions --json
c420ui-host remove-paths --json
c420ui-host fs-ops --json
c420ui-host ensure-linux-unpacked --json
c420ui-host artifact-file-ops --json
c420ui-tui --version
c420ui-tui doctor --json
c420ui-tui render --json
c420ui-tui run --json-lines
```

## Phase 4 TUI Runtime Contract

Dev12 now starts the direct TUI migration. `runC420UITerminalApp()` routes
through `c420ui-tui` as the official terminal runtime. There is no experimental
backend switch and no TypeScript/Rust optional toggle.

The TypeScript Action Engine remains responsible for action resolution,
execution, root-provider interaction and progress/log events. Rust owns terminal
rendering, navigation, action selection, progress display, log display and the
visual root prompt. Rust emits `action-selected`; TypeScript executes the action
and sends logs/progress/action lifecycle updates back over JSON-lines.

The legacy TypeScript TUI remains only until Phase 5 removal.

## Phase 2 Filesystem Contract

Dev12 now continues Phase 2 by moving install and artifact filesystem
operations to c420ui-host. Dependent projects declare install identity and
paths; c420ui validates and orchestrates; Rust performs safe filesystem
operations. The Dev12 roadmap now includes direct c420ui-tui migration after
operational cleanup, with no experimental backend phase.

Phase 2 acceptance:

- `build-resources/c420ui/host/preflight.ts` is removed.
- native install uses `rust-fs`.
- icon install uses `rust-fs`.
- linux-unpacked normalization uses Rust and preserves the selected architecture name.
- AppImage cleanup/find/checksum sidecars use Rust host operations.
- c420ui operations do not hardcode Canva Linux install identity.
- Canva Linux declares install identity and paths in dependent config.
- Rust contains no Canva Linux identity.

## Data Contract

Rust communicates with TypeScript through:

- stdin/stdout JSON
- JSON-lines for streaming process events
- stable exit codes
- safe stderr
- no shell interpretation for structured commands
- no project secrets
- no hardcoded dependent-project identity

## Not In Dev12 Runtime Scope

Do not migrate these Canva Linux runtime areas in Dev12:

- Electron runtime
- toolbar
- tabs
- CLeyedropper
- Canva Linux adapter policy
- Canva Linux packaging policy

Do not remove the legacy TypeScript terminal UI before Phase 5.
