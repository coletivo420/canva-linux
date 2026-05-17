# Canva Linux versioning

## Base version

The source tree keeps clean base identifiers without build metadata:

- `package.json` `version`: `0.1.4-15.Dev.8`
- `config/canva-linux/project-ui.json` `displayVersion`: `0.1.4-15.Dev`
- `config/canva-linux/project-ui.json` `phase`: `0.1.4-15.Dev.8`

Dev.8 is open for the internal tab-strip redesign; source versions must remain clean base identifiers without `+g` metadata.

## Effective version

Builds generate `config/canva-linux/build-metadata.json` and append the deterministic build revision to runtime and artifact-facing fields:

- `version`: `0.1.4-15.Dev.8+g<short-hash>`
- `displayVersion`: `0.1.4-15.Dev+g<short-hash>`
- `phase`: `0.1.4-15.Dev.8+g<short-hash>`
- `fullVersion`: `0.1.4-15.Dev.8+g<short-hash>`

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

## Dev.8 tab-strip version guardrails

Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model, but it must be rendered
by a dedicated pinned-home renderer and must never be rendered as a regular tab item.

The pinned home tab belongs to the tab strip, not the window titlebar. Do not change BrowserWindow title logic for this
feature, and do not render the home tab twice.

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
## Dev.7 hotfix guardrails

- c420ui must display Canva Linux effective build metadata when `config/canva-linux/build-metadata.json`, CI revision
  variables, or a source checkout `.git` HEAD can provide it; source `package.json` and `project-ui.json` stay free of
  committed `+g<hash>` metadata.
- The c420ui brand version remains independent and comes from `packages/c420ui/package.json`; c420ui-specific
  `0.1.0+g<hash-do-c420ui>` metadata is future work, not part of this hotfix.
- `build:c420ui-bootstrap` must refresh or resolve effective build metadata before writing the bootstrap manifest, including
  dependent project full version, build revision, display version, and phase.
- MediaDevices diagnostics must preserve native receiver binding for `getUserMedia` and `getDisplayMedia`, including detached
  calls, and must not log token/cookie/code/state values.
- Toolbar favicons must respect the internal CSP by rendering only `data:` and `file:` image URLs, falling back instead of
  rendering remote `https:` favicons.
- OAuth localized public-landing probes must normalize both DOM attributes and localized keywords with NFKD so composed and
  decomposed labels are equivalent.

