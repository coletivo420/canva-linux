import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateC420UIDevelopmentConfig } from "../packages/c420ui/src";
import { loadCanvaLinuxActions } from "../scripts/canva-linux/actions/registry";
import { loadCanvaLinuxDevelopmentTasks } from "../scripts/c420ui-adapter/development";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..");
const developmentConfigPath = path.join(rootDir, "config/canva-linux/development.json");
const adapterPath = path.join(rootDir, "scripts/c420ui-adapter/adapter.ts");

test("config/canva-linux/development.json loads", () => {
  const config = JSON.parse(fs.readFileSync(developmentConfigPath, "utf8"));

  assert.doesNotThrow(() => validateC420UIDevelopmentConfig(config));
  assert.equal(loadCanvaLinuxDevelopmentTasks(rootDir).length > 0, true);
});

test("every development task points to an existing action", () => {
  const tasks = loadCanvaLinuxDevelopmentTasks(rootDir);
  const actions = loadCanvaLinuxActions(rootDir);
  const actionIds = new Set(actions.map((action) => action.id));

  assert.deepEqual(
    tasks.filter((task) => !actionIds.has(task.actionId)).map((task) => task.id),
    [],
  );
});

test("doctor, validate, build, package, and release recipes exist", () => {
  const kinds = new Set(loadCanvaLinuxDevelopmentTasks(rootDir).map((task) => task.kind));

  for (const kind of ["doctor", "validate", "build", "package", "release"] as const) {
    assert.equal(kinds.has(kind), true, `missing ${kind}`);
  }
});

test("adapter loadWorkflows uses the development provider", () => {
  const adapterSource = fs.readFileSync(adapterPath, "utf8");

  assert.equal(adapterSource.includes("loadCanvaLinuxDevelopmentWorkflows"), true);
  assert.equal(adapterSource.includes("return loadCanvaLinuxDevelopmentWorkflows(resolvedRootDir)"), true);
});

test("adapter does not contain manual toC420UIWorkflow assembly", () => {
  const adapterSource = fs.readFileSync(adapterPath, "utf8");

  assert.equal(adapterSource.includes("toC420UIWorkflow"), false);
  assert.equal(adapterSource.includes("actions.map(toC420UIWorkflow)"), false);
});
