import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateC420UIDevelopmentConfig } from "../packages/c420ui/src";
import { loadCanvaLinuxActions } from "../scripts/canva-linux/actions/registry";
import { loadCanvaLinuxC420UIActions } from "../scripts/c420ui-adapter/actions";
import {
  loadCanvaLinuxDevelopmentTasks,
  loadCanvaLinuxDevelopmentWorkflows,
  validateCanvaLinuxDevelopmentTasksAgainstActions,
} from "../scripts/c420ui-adapter/development";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..");
const developmentConfigPath = path.join(rootDir, "config/canva-linux/development.json");
const adapterPath = path.join(rootDir, "scripts/c420ui-adapter/adapter.ts");
const developmentAdapterPath = path.join(rootDir, "scripts/c420ui-adapter/development.ts");

function tasksAndActions() {
  const tasks = loadCanvaLinuxDevelopmentTasks(rootDir);
  const actions = loadCanvaLinuxC420UIActions(rootDir);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  return { tasks, actions, actionsById };
}

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

test("development task requiresRoot does not contradict action requiresRoot", () => {
  const { tasks, actionsById } = tasksAndActions();

  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    assert.ok(action, `missing ${task.actionId}`);
    if (task.requiresRoot !== undefined) {
      assert.equal(Boolean(task.requiresRoot), Boolean(action.requiresRoot), task.id);
    }
  }

  assert.throws(
    () =>
      validateCanvaLinuxDevelopmentTasksAgainstActions(
        [{ id: "doctor", label: "Doctor", kind: "doctor", actionId: "doctor", requiresRoot: true }],
        loadCanvaLinuxC420UIActions(rootDir),
      ),
    /requiresRoot contradicts/i,
  );
});

test("development task scope does not contradict action scope", () => {
  const { tasks, actionsById } = tasksAndActions();

  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    assert.ok(action, `missing ${task.actionId}`);
    if (task.scope !== undefined) assert.equal(task.scope, action.scope, task.id);
  }

  assert.throws(
    () =>
      validateCanvaLinuxDevelopmentTasksAgainstActions(
        [{ id: "doctor", label: "Doctor", kind: "doctor", actionId: "doctor", scope: "system" }],
        loadCanvaLinuxC420UIActions(rootDir),
      ),
    /scope contradicts/i,
  );
});

test("planned and non-planned development tasks match action planned state", () => {
  const { tasks, actionsById } = tasksAndActions();

  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    assert.ok(action, `missing ${task.actionId}`);
    const actionPlanned = action.kind === "planned" || action.planned === true;
    assert.equal(task.planned === true, actionPlanned, task.id);
  }

  assert.throws(
    () =>
      validateCanvaLinuxDevelopmentTasksAgainstActions(
        [{ id: "bundle-deb", label: "Build Deb", kind: "package", actionId: "bundle-deb" }],
        loadCanvaLinuxC420UIActions(rootDir),
      ),
    /planned/i,
  );
});

test("supportsDryRun=true does not point to planned actions", () => {
  const { tasks, actionsById } = tasksAndActions();

  for (const task of tasks.filter((item) => item.supportsDryRun === true)) {
    const action = actionsById.get(task.actionId);
    assert.ok(action, `missing ${task.actionId}`);
    assert.equal(action.kind, "command", task.id);
    assert.notEqual(action.planned, true, task.id);
  }

  assert.throws(
    () =>
      validateCanvaLinuxDevelopmentTasksAgainstActions(
        [
          {
            id: "bundle-deb",
            label: "Build Deb",
            kind: "package",
            actionId: "bundle-deb",
            planned: true,
            supportsDryRun: true,
          },
        ],
        loadCanvaLinuxC420UIActions(rootDir),
      ),
    /dry-run/i,
  );
});

test("workflows preserve metadata from the real action", () => {
  const workflows = loadCanvaLinuxDevelopmentWorkflows(rootDir);
  const buildRuntime = workflows.find((workflow) => workflow.id === "build-runtime");
  const action = loadCanvaLinuxC420UIActions(rootDir).find((item) => item.id === "build-runtime");

  assert.ok(buildRuntime);
  assert.ok(action);
  assert.equal(buildRuntime.actions[0]?.command, action.command);
  assert.deepEqual(buildRuntime.actions[0]?.args, action.args);
  assert.equal(buildRuntime.actions[0]?.longRunning, action.longRunning);
  assert.equal(buildRuntime.actions[0]?.description, action.description);
});

test("adapter loadWorkflows uses the development provider", () => {
  const adapterSource = fs.readFileSync(adapterPath, "utf8");

  assert.equal(adapterSource.includes("loadCanvaLinuxDevelopmentWorkflows"), true);
  assert.equal(adapterSource.includes("return loadCanvaLinuxDevelopmentWorkflows(resolvedRootDir)"), true);
});

test("adapter centralizes action conversion outside adapter.ts", () => {
  const adapterSource = fs.readFileSync(adapterPath, "utf8");
  const developmentSource = fs.readFileSync(developmentAdapterPath, "utf8");

  assert.equal(adapterSource.includes("loadCanvaLinuxC420UIActions"), true);
  assert.equal(developmentSource.includes("loadCanvaLinuxC420UIActions"), true);
  assert.equal(developmentSource.includes("createC420UIDevelopmentWorkflowFromAction"), true);
  assert.equal(adapterSource.includes("toC420UIActionDescriptor"), false);
  assert.equal(adapterSource.includes("actions.map(toC420UIWorkflow)"), false);
});
