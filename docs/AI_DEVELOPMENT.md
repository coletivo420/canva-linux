# AI-Assisted Development Guidelines

This document defines project conventions for AI-assisted development and vibecoding in the `1.4.10-dev.4` cycle.

## Language and communication conventions

- Human-facing assistant responses should be written in Portuguese.
- Source code, inline code comments, and repository documentation must stay in English.
- Keep technical wording precise and consistent with existing project terminology.

## Development workflow expectations

- Always update `CHANGELOG.md` for each development delivery.
- Always bump project version metadata for dev deliveries.
- Prefer small, reviewable patches that are easy to revert.
- Avoid large architecture changes without explicit scope validation.
- Preserve the stable/dev workflow already used by this repository.

## Scope guardrails

- Do not revive native Linux/Wayland OAuth popup icon work unless explicitly requested.
- Keep runtime behavior unchanged when a patch is documentation/readability-only.

## Readability conventions

- When touching shell scripts, config-like files, or large source files, use `##` section markers when they improve readability.
- Keep build and release scripts readable with short `##` section markers.
- Do not over-comment obvious code paths.
- Keep section markers short, descriptive, and in English.

## Grounding for future AI sessions

Before proposing or applying changes, align with the current state documented in:

- `README.md`
- `CHANGELOG.md`
- `docs/TECHNICAL.md`
- `docs/FLATHUB.md`
- `docs/FLATPAK_PERMISSIONS.md`
- `docs/AI_DEVELOPMENT.md`

## Cycle summary

For this cycle, keep this focus explicit:

`1.4.10-dev.4 = credential-storage diagnostics + branch policy cleanup + AI-assisted maintenance.`

## Development branch naming

Development branches must use only the target version number.

Format:

`dev/<version>`

Examples:

- `dev/1.4.10-dev.4`
- `dev/1.4.10-dev.5`
- `dev/1.4.10-rc.1`

Rules:

- Use `dev/<version>` for development-cycle branches.
- Do not use `codex/` for development branches.
- Do not append purpose suffixes.
- Development PRs must target `dev`.
- Branches should remain short-lived during active development.
- Branches may be kept until the stable release if the maintainer explicitly wants to preserve development history.
