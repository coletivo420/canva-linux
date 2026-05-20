import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
  type c420uiAction,
  type c420uiActionResult,
  type c420uiExecutionContext,
  type c420uiProjectBridge,
  type C420UIEvent,
} from "../src";

function createFakeBridge(options: {
  actions: c420uiAction[];
  result?: c420uiActionResult;
}) {
  const runCalls: Array<{ actionId: string; context: c420uiExecutionContext }> = [];
  const bridge: c420uiProjectBridge = {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return options.actions;
    },
    artifactWorkflows() {
      return [];
    },
    async runAction(actionId, context) {
      runCalls.push({ actionId, context });
      return options.result ?? {
        code: c420uiExitCodes.success,
        status: "success",
        message: "ok",
      };
    },
  };

  return { bridge, runCalls };
}

const commandAction: c420uiAction = {
  id: "doctor",
  label: "Doctor",
  group: "validation",
  kind: "command",
  description: "Run diagnostics",
  cliFlags: ["--doctor"],
};

const legacyCliAction = {
  id: "legacy",
  label: "Legacy",
  group: "maintenance",
  kind: "command",
  description: "Legacy command",
  cli: ["--legacy"],
} as c420uiAction & { cli: string[] };

const plannedAction: c420uiAction = {
  id: "bundle",
  label: "Bundle",
  group: "package",
  kind: "planned",
  description: "Package workflow is planned",
};

test("c420ui action engine lists actions from the bridge", () => {
  const { bridge } = createFakeBridge({ actions: [commandAction, plannedAction] });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(engine.listActions(), [commandAction, plannedAction]);
});

test("c420ui action engine resolves actions by id", () => {
  const { bridge } = createFakeBridge({ actions: [commandAction] });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(engine.resolveActionById("doctor"), {
    found: true,
    action: commandAction,
  });
});

test("c420ui action engine returns not-found for unknown action ids", () => {
  const { bridge } = createFakeBridge({ actions: [commandAction] });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(engine.resolveActionById("missing"), {
    found: false,
    reason: "not-found",
    query: "missing",
  });
});

test("c420ui action engine resolves actions by cliFlags", () => {
  const { bridge } = createFakeBridge({ actions: [commandAction] });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(engine.resolveActionByCliFlag("--doctor"), {
    found: true,
    action: commandAction,
  });
});

test("c420ui action engine resolves actions by legacy cli flags", () => {
  const { bridge } = createFakeBridge({ actions: [legacyCliAction] });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(engine.resolveActionByCliFlag("--legacy"), {
    found: true,
    action: legacyCliAction,
  });
});

test("planned actions return the planned-action exit code without running bridge actions", async () => {
  const events: C420UIEvent[] = [];
  const { bridge, runCalls } = createFakeBridge({ actions: [plannedAction] });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runAction(plannedAction);

  assert.equal(result.code, c420uiExitCodes.plannedAction);
  assert.equal(result.status, "planned");
  assert.equal(result.message, plannedAction.description);
  assert.equal(runCalls.length, 0);
  assert.deepEqual(events.map((event) => event.type), ["action:planned"]);
});

test("planned dry-run actions return success without running bridge actions", async () => {
  const events: C420UIEvent[] = [];
  const { bridge, runCalls } = createFakeBridge({ actions: [plannedAction] });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runAction(plannedAction, { dryRun: true });

  assert.deepEqual(result, {
    code: c420uiExitCodes.success,
    status: "success",
    message: "dry-run",
  });
  assert.equal(runCalls.length, 0);
  assert.deepEqual(events.map((event) => event.type), ["action:start", "action:finish"]);
});

test("dry-run actions return success without running bridge actions", async () => {
  const events: C420UIEvent[] = [];
  const { bridge, runCalls } = createFakeBridge({ actions: [commandAction] });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runAction(commandAction, { dryRun: true });

  assert.deepEqual(result, {
    code: c420uiExitCodes.success,
    status: "success",
    message: "dry-run",
  });
  assert.equal(runCalls.length, 0);
  assert.deepEqual(events.map((event) => event.type), ["action:start", "action:finish"]);
});

test("command actions call bridge.runAction with execution context", async () => {
  const events: C420UIEvent[] = [];
  const env = { TEST_ENV: "1" } as NodeJS.ProcessEnv;
  const { bridge, runCalls } = createFakeBridge({ actions: [commandAction] });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    env,
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runActionById("doctor", { yes: true });

  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(runCalls.length, 1);
  const runCall = runCalls[0];
  assert.ok(runCall);
  assert.equal(runCall.actionId, "doctor");
  assert.equal(runCall.context.rootDir, "/repo");
  assert.equal(runCall.context.dryRun, false);
  assert.equal(runCall.context.yes, true);
  assert.equal(runCall.context.env, env);
  assert.deepEqual(events.map((event) => event.type), ["action:start", "action:finish"]);
});

test("bridge action results are propagated", async () => {
  const failedResult: c420uiActionResult = {
    code: c420uiExitCodes.generalError,
    status: "failed",
    message: "failed",
  };
  const { bridge } = createFakeBridge({
    actions: [commandAction],
    result: failedResult,
  });
  const engine = createC420UIActionEngine({ bridge, rootDir: "/repo" });

  assert.deepEqual(await engine.runAction(commandAction), failedResult);
});
