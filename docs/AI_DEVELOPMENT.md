# AI-Assisted Development Guidelines

This document defines project conventions for AI-assisted development and vibecoding in the `1.4.9-dev.X` cycle.

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
- Do not over-comment obvious code paths.
- Keep section markers short, descriptive, and in English.

## Grounding for future AI sessions

Before proposing or applying changes, align with the current state documented in:

- `README.md`
- `CHANGELOG.md`
- `docs/TECHNICAL.md`
- `docs/FLATHUB.md` (when available)
- `docs/AI_DEVELOPMENT.md`

## Cycle summary

For this cycle, keep this focus explicit:

`1.4.9-dev.X = distribuição + Flathub + manutenção assistida por IA.`
