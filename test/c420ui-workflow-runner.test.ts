import assert from "node:assert/strict";
import test from "node:test";

import {
  c420uiExitCodes,
  runC420UIArtifactWorkflow,
  type c420uiActionResult,
  type c420uiRunnableArtifactWorkflow,
  type C420UIActionDescriptor,
  type C420UIEvent,
} from "../packages/c420ui/src";

type WorkflowEvent = C420UIEvent & {
  data?: Record<string, unknown>;
  level?: string;
  message: string;
};

function eventOfType(events: C420UIEvent[], type: string): WorkflowEvent | undefined {
  return events.find((event): event is WorkflowEvent => event.type === type);
}

const buildActionDescriptor: C420UIActionDescriptor = {
  id: "build-action",
  label: "Build artifact",
  group: "package",
  section: "Artifacts",
  kind: "command",
};

function workflow(
  overrides: Partial<c420uiRunnableArtifactWorkflow> = {},
): c420uiRunnableArtifactWorkflow {
  return {
    id: "artifact",
    label: "Artifact",
    buildActionId: "build-action",
    validateActionId: "validate-action",
    installActionId: "install-action",
    outputPattern: "dist/artifact-*",
    ...overrides,
  };
}

async function runPhase(
  target: c420uiRunnableArtifactWorkflow,
  phase: "build" | "validate" | "install" | "uninstall" | "purge" | "release",
  result: c420uiActionResult = { code: c420uiExitCodes.success, status: "success", message: "ok" },
  dryRun = false,
) {
  const calls: string[] = [];
  const events: C420UIEvent[] = [];
  const runResult = await runC420UIArtifactWorkflow(target, {
    phase,
    dryRun,
    emit(event) {
      events.push(event);
    },
    runAction(actionId) {
      calls.push(actionId);
      return result;
    },
  });
  return { calls, events, result: runResult };
}

test("build executes buildActionId", async () => {
  const { calls, result } = await runPhase(workflow(), "build");

  assert.deepEqual(calls, ["build-action"]);
  assert.equal(result.code, c420uiExitCodes.success);
});

test("validate executes validateActionId", async () => {
  const { calls, result } = await runPhase(workflow(), "validate");

  assert.deepEqual(calls, ["validate-action"]);
  assert.equal(result.status, "success");
});

test("install executes installActionId", async () => {
  const { calls, result } = await runPhase(workflow(), "install");

  assert.deepEqual(calls, ["install-action"]);
  assert.equal(result.status, "success");
});

test("missing phase returns invalidUsage", async () => {
  const { calls, result } = await runPhase(workflow({ purgeActionId: undefined }), "purge");

  assert.deepEqual(calls, []);
  assert.equal(result.code, c420uiExitCodes.invalidUsage);
  assert.equal(result.status, "failed");
  assert.equal(result.message, "artifact does not support purge");
});

test("planned workflow returns plannedAction", async () => {
  const { calls, result, events } = await runPhase(workflow({ planned: true }), "build");

  assert.deepEqual(calls, []);
  assert.equal(result.code, c420uiExitCodes.plannedAction);
  assert.equal(result.status, "planned");
  assert.equal(events.some((event) => event.type === "action:planned"), true);
  assert.equal(eventOfType(events, "workflow:finish")?.data?.dryRun, false);
});

test("unsupported phase emits workflow finish with error level", async () => {
  const { events, result } = await runPhase(workflow({ installActionId: undefined }), "install");
  const finish = eventOfType(events, "workflow:finish");

  assert.equal(result.code, c420uiExitCodes.invalidUsage);
  assert.equal(finish?.level, "error");
  assert.equal(finish?.data?.dryRun, false);
});

test("dryRun does not call runAction", async () => {
  const { calls, result } = await runPhase(workflow(), "build", undefined, true);

  assert.deepEqual(calls, []);
  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(result.message, "dry-run");
});

test("action events prefer action labels over raw action IDs", async () => {
  const { events } = await runPhase(workflow({ actions: [buildActionDescriptor] }), "build");

  assert.equal(eventOfType(events, "action:start")?.message, "Build artifact");
  assert.equal(eventOfType(events, "action:finish")?.message, "Build artifact");
});

test("action events use readable fallback messages when action labels are unavailable", async () => {
  const { events } = await runPhase(workflow(), "build");

  assert.equal(eventOfType(events, "action:start")?.message, "Executing action: build-action");
  assert.equal(eventOfType(events, "action:finish")?.message, "Finished action: build-action");
});

test("non-zero action result propagates failure", async () => {
  const failure: c420uiActionResult = {
    code: c420uiExitCodes.generalError,
    status: "failed",
    message: "failed action",
  };
  const { calls, result } = await runPhase(workflow(), "build", failure);

  assert.deepEqual(calls, ["build-action"]);
  assert.deepEqual(result, failure);
});

test("workflow start and finish events are emitted", async () => {
  const { events } = await runPhase(workflow(), "build");

  assert.equal(events[0]?.type, "workflow:start");
  assert.equal(events.at(-1)?.type, "workflow:finish");
});

test("outputPattern is included in event data", async () => {
  const { events } = await runPhase(workflow({ outputPattern: "dist/custom-*" }), "build");

  assert.equal(
    events.every((event) =>
      "data" in event && event.data
        ? event.data.outputPattern === "dist/custom-*"
        : true,
    ),
    true,
  );
});
