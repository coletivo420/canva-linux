import assert from "node:assert/strict";
import test from "node:test";

import {
  createInteractiveActionRunner,
  type InteractiveActionRunnerState,
} from "../src/terminal/interactive-action-runner.js";
import {
  c420uiExitCodes,
  type C420UIEventSink,
  type c420uiAction,
  type c420uiActionResult,
  type c420uiLogSource,
  type c420uiProjectBridge,
  type c420uiRootAccessRequester,
  type c420uiRootProvider,
  type createC420UIActionEngine,
} from "../src/index.js";

const normalAction: c420uiAction = {
  id: "doctor",
  label: "Doctor",
  group: "validation",
  kind: "command",
  command: "/bin/true",
};

const rootAction: c420uiAction = {
  id: "install-native-system",
  label: "Install Native System",
  group: "install",
  kind: "command",
  command: "/bin/true",
  requiresRoot: true,
};

const dangerousAction: c420uiAction = {
  id: "purge",
  label: "Purge",
  group: "maintenance",
  kind: "command",
  command: "/bin/true",
  dangerous: true,
};

function createBridge(actions: c420uiAction[]): c420uiProjectBridge {
  return {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return actions;
    },
    artifactWorkflows() {
      return [];
    },
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by interactive action tests");
    },
  };
}

function createRootProvider(requiresRoot: boolean): c420uiRootProvider {
  return {
    id: "fake-root-provider",
    label: "Fake root provider",
    buildActionEnvironment(_action, env) {
      return env;
    },
    validateActionScope() {
      return { ok: true };
    },
    resolveRootPolicy() {
      return requiresRoot
        ? { requiresRoot: true, reason: "test requires root" }
        : { requiresRoot: false };
    },
    validateRootAccess() {
      return { ok: true };
    },
  };
}

function createRunner(options: {
  bridge: c420uiProjectBridge;
  rootProvider?: c420uiRootProvider;
  requestRootAccess?: c420uiRootAccessRequester;
  runAction?: (
    action: c420uiAction,
    runOptions: { dryRun?: boolean; yes?: boolean; signal?: AbortSignal },
    emit?: C420UIEventSink,
  ) => Promise<c420uiActionResult>;
}) {
  const logs: Array<{ text: string; source: c420uiLogSource }> = [];
  const progress: Array<{ state: string; percent?: number; label: string }> = [];
  const running: boolean[] = [];
  const engineCalls: Array<{ actionId: string; yes?: boolean; dryRun?: boolean }> = [];
  let capturedRequestRootAccess: c420uiRootAccessRequester | undefined;
  const createActionEngine: typeof createC420UIActionEngine = (engineOptions) => {
    capturedRequestRootAccess = engineOptions.requestRootAccess;
    return {
      listActions() {
        return options.bridge.actions();
      },
      resolveActionById(actionId: string) {
        const action = options.bridge.actions().find((candidate) => candidate.id === actionId);
        return action
          ? { found: true as const, action }
          : { found: false as const, reason: "not-found" as const, query: actionId };
      },
      resolveActionByCliFlag(flag: string) {
        return { found: false as const, reason: "not-found" as const, query: flag };
      },
      async runAction(action, runOptions = {}) {
        engineCalls.push({
          actionId: action.id,
          yes: runOptions.yes,
          dryRun: runOptions.dryRun,
        });
        if (options.runAction) {
          return options.runAction(action, runOptions, engineOptions.emit);
        }
        engineOptions.emit?.({
          type: "action:start",
          actionId: action.id,
          message: action.label,
        });
        engineOptions.emit?.({ type: "log", source: "stdout", line: "hello" });
        engineOptions.emit?.({
          type: "progress",
          state: "success",
          percent: 100,
          label: "Done",
        });
        engineOptions.emit?.({
          type: "action:finish",
          actionId: action.id,
          message: action.label,
          data: { exitCode: c420uiExitCodes.success, status: "success" },
        });
        return { code: c420uiExitCodes.success, status: "success" };
      },
      async runActionById(actionId, runOptions = {}) {
        const resolution = this.resolveActionById(actionId);
        if (!resolution.found) {
          return { code: c420uiExitCodes.invalidUsage, status: "failed" };
        }
        return this.runAction(resolution.action, runOptions);
      },
    };
  };

  const runner = createInteractiveActionRunner({
    bridge: options.bridge,
    rootDir: "/repo",
    rootProvider: options.rootProvider,
    requestRootAccess: options.requestRootAccess,
    createActionEngine,
    env: { TEST_ENV: "1" },
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

  return { runner, logs, progress, running, engineCalls, capturedRequestRootAccess: () => capturedRequestRootAccess };
}

test("interactive normal action calls the injected Action Engine and routes events", async () => {
  const { runner, logs, progress, running, engineCalls } = createRunner({
    bridge: createBridge([normalAction]),
  });

  const result = await runner.runAction(normalAction);

  assert.equal(result.status, "success");
  assert.deepEqual(engineCalls, [{ actionId: "doctor", yes: false, dryRun: false }]);
  assert.deepEqual(logs, [{ text: "hello\n", source: "stdout" }]);
  assert.ok(progress.some((event) => event.state === "success" && event.label === "Done"));
  assert.deepEqual(running, [true, false]);
  assert.equal((runner.state as InteractiveActionRunnerState).progressState, "success");
});

test("interactive dangerous action canceled before engine execution", async () => {
  const { runner, logs, progress, engineCalls } = createRunner({
    bridge: createBridge([dangerousAction]),
    rootProvider: createRootProvider(true),
  });

  const result = await runner.runAction(dangerousAction, { confirmed: false });

  assert.equal(result.status, "canceled");
  assert.deepEqual(engineCalls, []);
  assert.deepEqual(progress.at(-1), {
    state: "canceled",
    percent: 0,
    label: "Canceled",
  });
  assert.deepEqual(logs, [
    { text: "[info] Action canceled before execution.\n", source: "system" },
  ]);
});

test("interactive confirmed action passes yes=true to Action Engine", async () => {
  const { runner, engineCalls } = createRunner({
    bridge: createBridge([dangerousAction]),
  });

  const result = await runner.runAction(dangerousAction, { confirmed: true });

  assert.equal(result.status, "success");
  assert.deepEqual(engineCalls, [{ actionId: "purge", yes: true, dryRun: false }]);
});

test("interactive cancel aborts the running Action Engine signal", async () => {
  let abortObserved: (() => void) | undefined;
  const { runner, progress, logs } = createRunner({
    bridge: createBridge([normalAction]),
    runAction(_action, runOptions) {
      return new Promise<c420uiActionResult>((resolve) => {
        runOptions.signal?.addEventListener(
          "abort",
          () => {
            abortObserved?.();
            resolve({
              code: c420uiExitCodes.canceled,
              status: "canceled",
              message: "Action canceled.",
            });
          },
          { once: true },
        );
      });
    },
  });
  const aborted = new Promise<void>((resolve) => {
    abortObserved = resolve;
  });

  const runningAction = runner.runAction(normalAction);
  assert.equal(runner.cancel(), true);
  await aborted;
  const result = await runningAction;

  assert.equal(result.status, "canceled");
  assert.ok(progress.some((event) => event.state === "canceled"));
  assert.ok(logs.some((event) => event.text === "[info] Cancellation requested.\n" && event.source === "system"));
});

test("passes requestRootAccess to createC420UIActionEngine", async () => {
  const requestRootAccess: c420uiRootAccessRequester = () => ({ ok: true });
  const { runner, capturedRequestRootAccess } = createRunner({
    bridge: createBridge([rootAction]),
    rootProvider: createRootProvider(true),
    requestRootAccess,
  });

  await runner.runAction(rootAction, { confirmed: true });

  assert.equal(capturedRequestRootAccess(), requestRootAccess);
});
