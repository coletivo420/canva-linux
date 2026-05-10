import assert from "node:assert/strict";
import test from "node:test";

import {
  assertC420UIDevelopmentTaskMatchesAction,
  createC420UIDevelopmentWorkflow,
  createC420UIDevelopmentWorkflowFromAction,
  validateC420UIDevelopmentConfig,
  type c420uiDevelopmentConfig,
  type c420uiDevelopmentTask,
  type C420UIActionDescriptor,
} from "../packages/c420ui/src";

const validTask: c420uiDevelopmentTask = {
  id: "doctor",
  label: "Doctor",
  kind: "doctor",
  actionId: "doctor",
  requiresRoot: false,
  supportsDryRun: true,
  requiredFor: ["development"],
};

const validConfig: c420uiDevelopmentConfig = {
  tasks: [validTask],
};

const commandAction: C420UIActionDescriptor = {
  id: "doctor",
  label: "Doctor action",
  group: "development",
  section: "Validation",
  kind: "command",
  command: "bash",
  args: ["scripts/doctor.sh"],
  requiresRoot: false,
  scope: "user",
};

test("validates a valid development config", () => {
  assert.doesNotThrow(() => validateC420UIDevelopmentConfig(validConfig));
});

test("rejects a task without id", () => {
  assert.throws(
    () => validateC420UIDevelopmentConfig({ tasks: [{ ...validTask, id: undefined }] }),
    /missing id/i,
  );
});

test("rejects an invalid task kind", () => {
  assert.throws(
    () => validateC420UIDevelopmentConfig({ tasks: [{ ...validTask, kind: "invalid" }] }),
    /invalid development task kind/i,
  );
});

test("converts a task into a synthetic workflow", () => {
  const workflow = createC420UIDevelopmentWorkflow(validTask);

  assert.equal(workflow.id, "doctor");
  assert.equal(workflow.label, "Doctor");
  assert.equal(workflow.phase, "development");
  assert.equal(workflow.actions[0]?.id, "doctor");
});

test("preserves requiresRoot and supportsDryRun in synthetic workflow", () => {
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

test("preserves planned tasks in synthetic workflow", () => {
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
        tasks: [{ ...validTask, requiredFor: ["invalid"] }],
      }),
    /invalid development task requiredFor/i,
  );
});

test("createC420UIDevelopmentWorkflowFromAction preserves action command and args", () => {
  const workflow = createC420UIDevelopmentWorkflowFromAction(
    { ...validTask, scope: "user" },
    commandAction,
  );

  assert.equal(workflow.id, "doctor");
  assert.equal(workflow.label, "Doctor");
  assert.equal(workflow.actions[0]?.label, "Doctor action");
  assert.equal(workflow.actions[0]?.command, "bash");
  assert.deepEqual(workflow.actions[0]?.args, ["scripts/doctor.sh"]);
});

test("createC420UIDevelopmentWorkflowFromAction preserves action requiresRoot", () => {
  const workflow = createC420UIDevelopmentWorkflowFromAction(
    {
      id: "install-native-system",
      label: "Install system",
      kind: "install",
      actionId: "install-native-system",
      requiresRoot: true,
      scope: "system",
    },
    {
      ...commandAction,
      id: "install-native-system",
      requiresRoot: true,
      scope: "system",
    },
  );

  assert.equal(workflow.requiresRoot, true);
  assert.equal(workflow.actions[0]?.requiresRoot, true);
  assert.equal(workflow.actions[0]?.scope, "system");
});

test("assertC420UIDevelopmentTaskMatchesAction fails when planned diverges", () => {
  assert.throws(
    () =>
      assertC420UIDevelopmentTaskMatchesAction(validTask, {
        ...commandAction,
        kind: "planned",
        planned: true,
      }),
    /planned/i,
  );
});

test("assertC420UIDevelopmentTaskMatchesAction fails when scope diverges", () => {
  assert.throws(
    () =>
      assertC420UIDevelopmentTaskMatchesAction(
        { ...validTask, scope: "system" },
        { ...commandAction, scope: "user" },
      ),
    /scope contradicts/i,
  );
});
