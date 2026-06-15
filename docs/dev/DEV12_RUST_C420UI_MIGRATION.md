# Dev12 Rust c420ui Migration

## Status

Started.

## Goal

Dev12 migrates c420ui host-operation Shell logic to Rust.

This migration is c420ui-only.

Canva Linux remains ESM/TypeScript.

## Boundary Rule

Rust may be introduced only under c420ui-owned boundaries, starting with:

```text
build-resources/c420ui-rs/
```

Rust must not migrate, replace, wrap or own Canva Linux Electron runtime code.

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

TypeScript remains owner of:

- c420ui terminal UI
- Action Engine
- workflow orchestration
- workflow registry
- dependent-project adapters
- metadata policy
- validation policy
- Canva Linux integration boundary

## Rust May Own

- host dependency probes
- command availability checks
- filesystem probes
- permission checks
- safe process execution helpers
- artifact filesystem inspection
- install/uninstall execution primitives
- maintenance operation primitives

## Rust Must Not Own

- Canva Linux Electron runtime
- Canva Linux toolbar
- Canva Linux tabs
- Canva Linux CLeyedropper integration
- Canva Linux project identity
- Canva Linux packaging policy
- Canva Linux metadata policy
- Canva Linux adapter
- c420ui terminal UI
- c420ui Action Engine
- c420ui workflow registry

## Proposed Rust Layout

```text
build-resources/c420ui-rs/
  Cargo.toml
  src/main.rs
  src/commands/
  src/host/
  src/json/
  tests/
```

This layout is planned only. Dev11 must not create it.

## Initial Binary

```text
c420ui-host
```

## Initial Commands

```text
c420ui-host --version
c420ui-host doctor --json
c420ui-host host-info --json
```

## TypeScript Bridge

The bridge belongs to c420ui:

```text
build-resources/c420ui/src/rust-host.ts
```

Responsibilities:

- locate the Rust binary
- execute commands with timeout
- parse JSON
- normalize errors
- keep stderr safe
- preserve dry-run behavior
- keep Canva Linux-specific policy outside Rust

## Migration Order

1. Add Rust scaffold and JSON contracts.
2. Add TypeScript bridge.
3. Move host dependency probes.
4. Move command/filesystem probes.
5. Move artifact filesystem inspection.
6. Move maintenance operation primitives.
7. Move install/uninstall execution primitives.
8. Remove remaining Shell ownership of c420ui operational logic.

## Future Boundary Check

Dev12 should add:

```text
check:c420ui-rs-boundary
```

The check must fail if `build-resources/c420ui-rs/` contains hardcoded
dependent-project fragments such as:

- Canva Linux
- canva-linux
- io.github.coletivo420.canva-linux
- build-resources/electron
- build-resources/canva-linux
- CLeyedropper
- toolbar
- Electron runtime paths
- Flatpak/AppImage project policy

Rust must remain generic c420ui infrastructure.

## Data Contract

Rust must communicate with TypeScript through:

- stdin/stdout JSON
- stable exit codes
- safe stderr
- no project secrets
- no hardcoded Canva Linux identity

## Dev12 Commit 1 — Rust host scaffold

The first Dev12 implementation commit adds `build-resources/c420ui-rs/` with the `c420ui-host` Rust binary, JSON command contracts, Rust integration tests, and a TypeScript boundary check.

This commit must not wire Rust into Canva Linux runtime, Electron, toolbar, tabs, CLeyedropper, packaging policy, or the Canva Linux adapter.

