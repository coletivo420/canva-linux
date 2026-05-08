import assert from "node:assert/strict";
import test from "node:test";

import {
  createInteractiveActionRunner,
  type InteractiveActionRunnerState,
} from "../scripts/c420ui/interactive-action-runner";
import {
  c420uiExitCodes,
  type c420uiAction,
  type c420uiActionResult,
  type c420uiExecutionContext,
  type c420uiLogSource,
  type c420uiProjectBridge,
  type c420uiRootProvider,
} from "../packages/c420ui/src";

function createFakeBridge(options: {
  actions: c420uiAction[];
  onRun?: (actionId: string, context: c420uiExecutionContext) => void;
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
      options.onRun?.(actionId, context);
      return options.result ?? {
        code: c420uiExitCodes.success,
        status: "success",
      };
    },
  };

  return { bridge, runCalls };
}

function createFakeRootProvider(requiresRoot: boolean) {
  const calls: string[] = [];
  const provider: c420uiRootProvider = {
    id: "fake-root-provider",
    label: "Fake root provider",
    buildActionEnvironment(action, baseEnv) {
      calls.push("buildActionEnvironment");
      return { ...baseEnv, ROOT_PROVIDER_ACTION: action.id };
    },
    validateActionScope() {
      calls.push("validateActionScope");
      return { ok: true };
    },
    resolveRootPolicy() {
      calls.push("resolveRootPolicy");
      return requiresRoot
        ? { requiresRoot: true, reason: "test requires root" }
        : { requiresRoot: false };
    },
    validateRootAccess() {
      calls.push("validateRootAccess");
      return { ok: true };
    },
  };

  return { provider, calls };
}

function createRunner(options: {
  bridge: c420uiProjectBridge;
  rootProvider?: c420uiRootProvider;
}) {
  const logs: Array<{ text: string; source: c420uiLogSource }> = [];
  const progress: Array<{ state: string; percent?: number; label: string }> = [];
  const running: boolean[] = [];
  const runner = createInteractiveActionRunner({
    bridge: options.bridge,
    rootDir: "/repo",
    rootProvider: options.rootProvider,
    env: { TEST_ENV: "1" } as NodeJS.ProcessEnv,
    appendLogText(text, source) {
      logs.push({ text, source });
    },
    setProgress(state, percent, label) {
      progress.push({ state, percent, label });
    },
    setRunning(nextRunning) {
      running.push(nextRunning);
    },
  });

  return { runner, logs, progress, running };
}

const normalAction: c420uiAction = {
  id: "doctor",
  label: "Doctor",
  group: "validation",
  kind: "command",
};

const rootAction: c420uiAction = {
  id: "install-native-system",
  label: "Install Native System",
  group: "install",
  kind: "command",
  requiresRoot: true,
};

const dangerousAction: c420uiAction = {
  id: "purge",
  label: "Purge",
  group: "maintenance",
  kind: "command",
  dangerous: true,
};

test("interactive normal action calls bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [normalAction] });
  const { runner } = createRunner({ bridge });

  const result = await runner.runAction(normalAction);

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.equal(runCalls[0]?.actionId, "doctor");
});

test("interactive root action validates root access before bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider(true);
  const { runner } = createRunner({ bridge, rootProvider: provider });

  const result = await runner.runAction(rootAction, { confirmed: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
  ]);
});

test("interactive dry-run does not validate root access", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider(true);
  const { runner } = createRunner({ bridge, rootProvider: provider });

  const result = await runner.runAction(rootAction, { dryRun: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, []);
});

test("interactive dangerous action canceled before engine does not call bridge or root provider", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [dangerousAction] });
  const { provider, calls } = createFakeRootProvider(true);
  const { runner } = createRunner({ bridge, rootProvider: provider });

  const result = await runner.runAction(dangerousAction, { confirmed: false });

  assert.equal(result.status, "canceled");
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, []);
});

test("interactive dangerous action confirmed passes yes=true to bridge context", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [dangerousAction] });
  const { runner } = createRunner({ bridge });

  const result = await runner.runAction(dangerousAction, { confirmed: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.equal(runCalls[0]?.context.yes, true);
});

test("interactive log and progress events are routed to UI callbacks", async () => {
  const { bridge } = createFakeBridge({
    actions: [normalAction],
    onRun(_actionId, context) {
      context.emitLog({ source: "stdout", line: "hello" });
      context.emitProgress({ state: "success", percent: 100, label: "Done" });
    },
  });
  const { runner, logs, progress } = createRunner({ bridge });

  await runner.runAction(normalAction);

  assert.deepEqual(logs, [{ text: "hello\n", source: "stdout" }]);
  assert.ok(progress.some((event) => event.state === "success" && event.label === "Done"));
  assert.equal((runner.state as InteractiveActionRunnerState).progressState, "success");
});
