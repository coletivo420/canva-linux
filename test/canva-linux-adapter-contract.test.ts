import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function splitName(...parts: string[]): string {
  return parts.join("");
}

test("command runner does not implement planned fallback", () => {
  const runner = read("scripts/c420ui/process-runner.ts");

  assert.equal(runner.includes('action.kind === "planned"'), false);
  assert.equal(runner.includes("planned fallback"), false);
  assert.equal(runner.includes("Transitional bridge execution path"), false);
});

test("command runner does not implement dry-run fallback", () => {
  const runner = read("scripts/c420ui/process-runner.ts");

  assert.equal(runner.includes("context.dryRun"), false);
  assert.equal(runner.includes("dry-run fallback"), false);
  assert.equal(runner.includes("Defensive fallback only"), false);
});

test("command runner executes concrete commands only", () => {
  const runner = read("scripts/c420ui/process-runner.ts");

  assert.match(runner, /spawn\(command, args,/);
});

test("CLI actions route through the Action Runner policy engine", () => {
  const wrapper = read("scripts/run-c420ui.ts");
  const actionRunner = read("scripts/core/action-runner.ts");

  assert.match(wrapper, /build:c420ui/);
  assert.match(actionRunner, /--dry-run/);
  assert.match(actionRunner, /action\.kind === "planned"/);
});

test("obsolete npm dependency bootstrap shell helper is absent", () => {
  const obsoleteScript = path.join(
    repoRoot,
    "scripts",
    ["ensure", "npm", "dependencies.sh"].join("-"),
  );
  const preflight = read("scripts/preflight-common.sh");
  const obsoleteFunction = ["ensure", "npm", "dependencies"].join("_");

  assert.equal(fs.existsSync(obsoleteScript), false);
  assert.equal(preflight.includes(obsoleteFunction), false);
  assert.equal(preflight.includes("npm ci"), false);
  assert.equal(preflight.includes("npm install"), false);
});

test("preflight-common remains repository-check-only", () => {
  const preflight = read("scripts/preflight-common.sh");

  for (const helper of [
    "require_command()",
    "validate_json_file()",
    "validate_package_scripts()",
    "detect_package_version()",
    "validate_package_version_semver()",
  ]) {
    assert.equal(preflight.includes(helper), true);
  }

  for (const fragment of [
    splitName("CANVA", "_REQUIRED", "_NPM", "_DEPS"),
    splitName("CANVA", "_SKIP", "_NPM", "_INSTALL"),
    splitName("CANVA", "_NPM", "_REPAIR"),
  ]) {
    assert.equal(preflight.includes(fragment), false);
  }
});
