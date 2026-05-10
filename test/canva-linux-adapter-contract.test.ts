import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("adapter.runAction only executes concrete action commands", () => {
  const source = read("scripts/c420ui-adapter/adapter.ts");

  assert.equal(source.includes("Transitional bridge" + " execution path"), false);
  assert.equal(source.includes("Defensive fallback" + " only"), false);
  assert.equal(source.includes('action.kind === ' + '"planned"'), false);
  assert.equal(source.includes("action.planned"), false);
  assert.equal(source.includes("context." + "dryRun"), false);
  assert.equal(source.includes("runC420UICommand"), true);
  assert.equal(source.includes("env: context.env"), true);
});

test("CLI direct actions route through runC420UICli", () => {
  const source = read("scripts/c420ui-adapter/cli.ts");

  assert.equal(source.includes("runC420UICli"), true);
  assert.equal(source.includes("rootProvider: createCanvaLinuxRootProvider()"), true);
  assert.equal(source.includes("bridge.runAction"), false);
  assert.equal(source.includes("adapter.runAction"), false);
});

test("artifact workflows route through the Action Engine", () => {
  const source = read("scripts/c420ui-adapter/bridge.ts");

  assert.equal(source.includes("createC420UIActionEngine"), true);
  assert.equal(source.includes("runC420UIArtifactWorkflow"), true);
  assert.equal(source.includes("engine.runActionById"), true);
  assert.equal(source.includes("adapter.runAction(actionId"), false);
});

test("shell helper classification removes transitional npm bootstrap", () => {
  const preflight = read("scripts/preflight-common.sh");

  assert.equal(fs.existsSync(path.join(rootDir, "scripts/" + "ensure-npm-dependencies.sh")), false);
  assert.equal(preflight.includes("ensure_" + "npm_dependencies"), false);
  assert.equal(preflight.includes("npm ci"), false);
  assert.equal(preflight.includes("npm install"), false);
  assert.equal(preflight.includes("Repository-check-only"), true);
});
