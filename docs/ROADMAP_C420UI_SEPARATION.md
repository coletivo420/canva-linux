# C420UI Separation Roadmap

## Goal

Separate C420UI from Canva Linux so it can become a reusable terminal UI toolkit
without breaking Canva Linux installation, packaging, validation, or direct CLI
workflows.

This roadmap describes the internal compatibility-first path. It does not start
NPM publication, external package support, or module-system migration.

## Current state

C420UI was born inside Canva Linux and currently lives under `scripts/c420ui/`.
It is the active in-repo terminal interface implementation for Canva Linux.

Today, C420UI still shares repository-local assumptions with Canva Linux:

- project metadata and C420UI brand metadata are close together;
- direct CLI and C420UI workflows share `scripts/actions.json`;
- installation, packaging, validation, and maintenance actions are Canva
  Linux-specific;
- build and validation scripts expect the current repository layout;
- generated output still belongs under `.build/`, not package source trees.

## Target internal layout

The target internal layout is a boundary map, not a published package promise:

```text
packages/c420ui/
  src/
  package.json
  tsconfig.json

scripts/c420ui-canva-linux/
  adapter.ts
  run.ts
```

`packages/c420ui/` is reserved for a future reusable C420UI package workspace.
`scripts/c420ui-canva-linux/` is the Canva Linux-specific adapter boundary for
wiring project metadata, action definitions, detection/status summaries, and
launch behavior into the reusable C420UI core.

Until broader package and adapter wiring is complete, `scripts/c420ui/` remains
the source of truth for the in-repo implementation.

## Non-goals for this phase

- Do not migrate to ESM during this phase.
- Do not publish an NPM package during this phase.
- Do not remove `scripts/c420ui/` in one large change.
- Do not change visual behavior as part of the separation.
- Do not rewrite Action Runner.
- Do not change versioning.
- Do not move generated JavaScript into maintained source trees.
- Do not change release artifact architecture naming.

Separate for compatibility first; extract externally only after package and
adapter APIs stabilize.

## Phases

### 1. Security stabilization

Keep credential storage, root/sudo boundaries, logging privacy, and release
validation stable before moving C420UI code.

Acceptance points:

- persistent login policy remains gated by secure storage and available
  encryption;
- root-auth and privileged action behavior remain centralized;
- logs continue to avoid secrets, tokens, cookies, session values, and sudo
  stdin;
- C420UI and direct CLI behavior remain equivalent for registered actions.

### 2. Documentation and tree mapping

Use the project tree reference to prevent future changes from mixing C420UI core,
Canva Linux adapters, Electron runtime, packaging scripts, docs, and generated
outputs.

Acceptance points:

- `docs/PROJECT_TREE.md` stays current when directories are introduced or moved;
- public docs distinguish current state from planned package boundaries;
- internal AI guardrails continue to point to the project tree and this roadmap;
- historical internal docs are not rewritten merely to satisfy active-doc checks.

### 3. Package skeleton

Create the internal package workspace only after the current in-repo boundaries
are documented and validation is stable.

Planned shape:

```text
packages/c420ui/
  package.json
  tsconfig.json
  src/
```

Rules:

- keep CommonJS-compatible runtime expectations for this phase;
- do not switch the project to ESM;
- keep the package private/internal until the maintainer explicitly approves a
  publication plan;
- add build and typecheck wiring before moving behavior.

### 4. Adapter boundary

Introduce and then expand a Canva Linux adapter boundary that owns project-specific data and
runtime glue.

Initial shape:

```text
scripts/c420ui-canva-linux/
  adapter.ts
  run.ts
```

The adapter should own:

- Canva Linux project metadata;
- action registry wiring;
- installation and packaging status summaries;
- project-specific labels and release identity;
- launch integration from `canva-linux.sh` or direct TypeScript entrypoints.

C420UI core should not hardcode Canva Linux project metadata.

### 5. Move pure C420UI modules

Move only reusable modules after they are separated from Canva Linux-specific
assumptions.

Good candidates:

- focus-zone primitives;
- layout helpers;
- modal primitives;
- log panel rendering primitives;
- menu/list rendering primitives;
- C420UI brand-header primitives that do not know the Canva Linux project.

Rules:

- keep visual behavior unchanged;
- move one surface at a time;
- keep imports explicit and easy to review;
- keep tests passing after each move;
- avoid broad formatting churn.

### 6. Move Canva Linux-specific logic to adapter

Move project-specific pieces out of C420UI core after reusable modules are stable.

Adapter-owned examples:

- Canva Linux action labels and descriptions;
- install scope and package status messaging;
- project header values;
- release version display;
- doctor/validation action presentation;
- direct CLI integration points.

Do not duplicate Action Runner logic in the adapter. The adapter should call the
shared action contracts rather than reimplementing action execution.

### 7. Build and test integration

Wire the internal package and adapter into existing validation without weakening
current checks.

Acceptance points:

- `npm run lint` remains green;
- `npm run typecheck` remains green;
- `npm run typecheck:strict` expands deliberately, one surface at a time;
- `npm test` covers moved modules and adapter wiring;
- `npm run check:scripts-core` continues to enforce C420UI/action contracts;
- generated JavaScript remains under `.build/`.

### 8. Future standalone extraction

External extraction comes after internal APIs and adapters stabilize.

Before extraction:

- the reusable core must no longer depend on Canva Linux project metadata;
- adapter APIs must be stable enough for another project to implement;
- package build, typecheck, lint, and tests must be documented;
- release/version strategy must be explicitly approved by the maintainer;
- NPM publication, if any, must be a separate decision and release plan.

The standalone C420UI project should be treated as future work until these
conditions are met.
