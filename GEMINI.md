# Gemini Maintenance Policy for Canva Linux

This file provides project context for Gemini CLI. It is auxiliary agent policy, not public user documentation.

Required reading:
- README.md
- REVIEW.md
- CHANGELOG.md
- docs/DEVELOPMENT.md
- docs/TYPESCRIPT.md
- docs/internal/AI_GUARDRAILS.md
- docs/internal/LOGGING_CONTRACT.md
- docs/FEATURES.md
- docs/DEBUGGING.md

Non-regression rules:
- Do not run or recommend ./canva-linux.sh as root.
- Preserve version 0.1.4-14 unless explicitly instructed otherwise.
- Do not introduce 0.1.4-dev.14, 0.1.4-rc.14, or 0.1.4.14.
- Preserve the N.N.N-X release versioning rule.
- c420ui is the user-facing terminal interface name.
- Do not use Terminal Assistant or TUI as product names.
- Actions must come from config/canva-linux/actions.json.
- Do not duplicate action logic in c420ui or launcher code.
- Preserve the legacy Action Runner only as a compatibility path until an explicit legacy audit changes it.
- Preserve CL-EyeDropper.
- Preserve TypeScript-first source policy.
- Do not add maintained JavaScript source.
- Do not normalize x86_64/X86_64 to x64.
- Do not remove validations to make checks pass.
- Report validations executed and anything not tested.
- Never log passwords, sudo stdin, cookies, tokens, or credential material.

Gemini CLI note:
After changing this file, reload Gemini CLI project memory before continuing.

## Credential storage policy

- Persistent login must require a secure Linux Secret Service backend.
- If Electron reports `basic_text`, Canva Linux must use ephemeral session mode.
- `basic_text` must never use the `persist:canva` partition.
- Ephemeral session mode must warn the user that login, cookies and credentials will not be saved.
- Do not claim credentials are securely stored when the selected backend is `basic_text`.
- Do not log passwords, cookies, tokens, session values or credential material.
