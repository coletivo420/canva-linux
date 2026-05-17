# Canva Linux versioning

## Base version

The source tree keeps clean base identifiers without build metadata:

- `package.json` `version`: `0.1.4-15.Dev.7`
- `config/canva-linux/project-ui.json` `displayVersion`: `0.1.4-15.Dev`
- `config/canva-linux/project-ui.json` `phase`: `0.1.4-15.Dev.7`

Do not open `Dev.8` until a dedicated version-bump change does so.

## Effective version

Builds generate `config/canva-linux/build-metadata.json` and append the deterministic build revision to runtime and artifact-facing fields:

- `version`: `0.1.4-15.Dev.7+g<short-hash>`
- `displayVersion`: `0.1.4-15.Dev+g<short-hash>`
- `phase`: `0.1.4-15.Dev.7+g<short-hash>`
- `fullVersion`: `0.1.4-15.Dev.7+g<short-hash>`

The effective version is used by startup logs, `--version`, generated manifests, and build artifacts. Source versions must not be rewritten to include `+g`.

## Build revision

`buildRevision` is always deterministic. The generator resolves it in this order:

1. `CANVA_LINUX_BUILD_REVISION`
2. `GITHUB_SHA`
3. `CI_COMMIT_SHA`
4. `SOURCE_COMMIT`
5. `git rev-parse --short=7 HEAD`
6. `unknown`

Known revisions are normalized to `g<7-character-short-hash>`. Unknown revisions keep the base version unchanged. Do not use
random values, timestamps, or local counters.

## Runtime fallback metadata

Runtime fallback metadata must never hardcode the current Canva Linux phase as a safety net. If generated metadata and
source files are unavailable, the runtime falls back to neutral `0.0.0` base/display/phase values with
`buildRevision: "unknown"`. Partially loaded generated metadata is ignored unless it contains `baseVersion`,
`baseDisplayVersion`, and `basePhase`.

## OAuth rule

Post-OAuth reload preserves source context by default. The source tab reloads its current URL with `reloadIgnoringCache`
when available, otherwise `reload`.

Canonical Canva home navigation (`https://www.canva.com/`) is fallback-only after the post-load probe detects a localized
public logged-out landing page. Design, editor, and folder URLs must not be redirected by the first post-OAuth reload.

Localized public landing detection uses generic auth-signal counts for login/signup links and auth buttons. It must not log
DOM text, `aria-label`, `href`, `data-testid`, or other attribute values.

## c420ui future

The c420ui package remains independently versioned (`0.1.0`). The Canva Linux bootstrap manifest records Canva Linux
effective build metadata, and c420ui will receive the same build metadata policy in a future phase as an independent
project.
