import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIDevelopmentWorkflow,
  validateC420UIDevelopmentConfig,
  type c420uiDevelopmentConfig,
} from "../packages/c420ui/src";

const validConfig: c420uiDevelopmentConfig = {
  tasks: [
    {
      id: "doctor",
      label: "Doctor",
      kind: "doctor",
      actionId: "doctor",
      requiresRoot: false,
      supportsDryRun: true,
      requiredFor: ["development"],
    },
  ],
};

test("validates a valid development config", () => {
  assert.doesNotThrow(() => validateC420UIDevelopmentConfig(validConfig));
});

test("rejects a task without id", () => {
  assert.throws(
    () => validateC420UIDevelopmentConfig({ tasks: [{ ...validConfig.tasks[0], id: undefined }] }),
    /missing id/i,
  );
});

test("rejects an invalid task kind", () => {
  assert.throws(
    () => validateC420UIDevelopmentConfig({ tasks: [{ ...validConfig.tasks[0], kind: "invalid" }] }),
    /invalid development task kind/i,
  );
});

test("converts a task into a workflow", () => {
  const workflow = createC420UIDevelopmentWorkflow(validConfig.tasks[0]);

  assert.equal(workflow.id, "doctor");
  assert.equal(workflow.label, "Doctor");
  assert.equal(workflow.phase, "development");
  assert.equal(workflow.actions[0]?.id, "doctor");
});

test("preserves requiresRoot and supportsDryRun", () => {
  const workflow = createC420UIDevelopmentWorkflow({
    id: "install",
    label: "Install",
    kind: "install",
    actionId: "install-native-system",
    requiresRoot: true,
    supportsDryRun: true,
  });

  assert.equal(workflow.requiresRoot, true);
  assert.equal(workflow.supportsDryRun, true);
  assert.equal(workflow.actions[0]?.requiresRoot, true);
  assert.equal(workflow.actions[0]?.dryRun, "supported");
});

test("preserves planned tasks", () => {
  const workflow = createC420UIDevelopmentWorkflow({
    id: "release-artifacts",
    label: "Release artifacts",
    kind: "release",
    actionId: "release-artifacts",
    planned: true,
  });

  assert.equal(workflow.phase, "release");
  assert.equal(workflow.actions[0]?.kind, "planned");
  assert.equal(workflow.actions[0]?.planned, true);
});

test("does not accept an invalid requiredFor value", () => {
  assert.throws(
    () =>
      validateC420UIDevelopmentConfig({
        tasks: [{ ...validConfig.tasks[0], requiredFor: ["invalid"] }],
      }),
    /invalid development task requiredFor/i,
  );
});
