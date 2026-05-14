# c420ui Host Dependencies

c420ui owns generic host dependency policy. Dependent projects declare dependency
requirements; c420ui validates and reports them through reusable checks and
runner contracts.

## Controls

- Generic dependency config shape and validation.
- Minimum Node.js major-version checks.
- Host command lookup and required/optional command status.
- npm declared-versus-installed dependency checks.
- npm install strategy, repair mode, skip mode, messages, and exit codes.
- `C420UI_SKIP_DEPENDENCY_INSTALL` handling.
- `C420UI_DEPENDENCY_REPAIR` handling.

## Must not control

- Concrete Canva Linux dependency names outside config declarations.
- Canva Linux launcher logic beyond consuming the generic provider.
- Electron runtime behavior or package build behavior.

## Dependency config model

Projects declare dependency requirements in configuration. Canva Linux declares
its requirements in `config/canva-linux/dependencies.json`; c420ui validates the
shape and executes the generic check/ensure flow.

The Node policy checks the configured minimum major version. Command lookup
reports whether required commands are available and executable. npm dependency
checks compare declared dependencies against the lockfile and installed package
state.

`C420UI_SKIP_DEPENDENCY_INSTALL=1` skips npm installation. `C420UI_DEPENDENCY_REPAIR=clean`
requests clean repair behavior through the generic runner.

## Implementing files

- `packages/c420ui/src/host-dependencies.ts`
- `packages/c420ui/src/host-dependency-runner.ts`
- `packages/c420ui/src/command-dependencies.ts`
- `packages/c420ui/src/node-dependencies.ts`
- `packages/c420ui/src/npm-dependencies.ts`
- `scripts/c420ui-adapter/dependencies.ts`
- `config/canva-linux/dependencies.json`

## Boundary checks

- `npm run check:c420ui-core`
- `npm run check:canva-linux`
- `npm run deps:check-policy`
- `npm run check:shared-tooling`
- `npm test`

## Forbidden regressions

- Do not run `npm ci` or `npm install` directly from Canva Linux launchers.
- Do not restore `scripts/ensure-npm-dependencies.sh`.
- Do not put concrete Canva Linux dependency lists in c420ui core.
- Do not let `scripts/preflight-common.sh` own npm install or repair policy.
- Do not silently ignore missing required dependencies.
