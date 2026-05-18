import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
  type c420uiAction,
  type c420uiActionResult,
  type c420uiExecutionContext,
  type c420uiProjectBridge,
  type c420uiRootProvider,
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

function createFakeRootProvider(options: {
  scopeCode?: number;
  scopeMessage?: string;
  requiresRoot?: boolean;
  warning?: string;
  accessCode?: number;
  accessMessage?: string;
} = {}) {
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
      if (options.scopeCode !== undefined) {
        return {
          ok: false,
          code: options.scopeCode,
          message: options.scopeMessage ?? "scope failed",
        };
      }
      return { ok: true };
    },
    resolveRootPolicy() {
      calls.push("resolveRootPolicy");
      return options.requiresRoot
        ? { requiresRoot: true, reason: "test requires root" }
        : { requiresRoot: false, warning: options.warning };
    },
    validateRootAccess() {
      calls.push("validateRootAccess");
      if (options.accessCode !== undefined) {
        return {
          ok: false,
          code: options.accessCode,
          message: options.accessMessage ?? "access failed",
        };
      }
      return { ok: true };
    },
  };

  return { provider, calls };
}

const rootAction: c420uiAction = {
  id: "install-native",
  label: "Install Native",
  group: "install",
  kind: "command",
  requiresRoot: true,
};

const plannedRootAction: c420uiAction = {
  id: "bundle-deb",
  label: "Bundle deb",
  group: "package",
  kind: "planned",
  requiresRoot: true,
  description: "Deb package generation is planned",
};

const dangerousRootAction: c420uiAction = {
  id: "purge",
  label: "Purge",
  group: "maintenance",
  kind: "command",
  dangerous: true,
  requiresRoot: true,
};

test("dry-run does not call validateRootAccess", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { dryRun: true });

  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, []);
});

test("planned action does not call validateRootAccess", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [plannedRootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(plannedRootAction);

  assert.equal(result.code, c420uiExitCodes.plannedAction);
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, []);
});

test("dangerous action without yes does not call validateRootAccess", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [dangerousRootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(dangerousRootAction);

  assert.equal(result.code, c420uiExitCodes.generalError);
  assert.equal(result.status, "failed");
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, []);
});

test("requiresRoot action calls validateRootAccess before bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(runCalls.length, 1);
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
  ]);
});

test("validateActionScope failure returns 64 and does not call bridge", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({
    scopeCode: 64,
    scopeMessage: "scope rejected",
    requiresRoot: true,
  });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: 64,
    status: "failed",
    message: "scope rejected",
  });
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, ["buildActionEnvironment", "validateActionScope"]);
});

test("validateRootAccess failure propagates code and does not call bridge", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({
    requiresRoot: true,
    accessCode: 23,
    accessMessage: "access rejected",
  });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: 23,
    status: "failed",
    message: "access rejected",
  });
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
  ]);
});

test("successful root preflight calls bridge with provider-prepared env", async () => {
  const baseEnv = { ORIGINAL_ENV: "1" } as NodeJS.ProcessEnv;
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    env: baseEnv,
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(runCalls.length, 1);
  assert.deepEqual(runCalls[0]?.context.env, {
    ORIGINAL_ENV: "1",
    ROOT_PROVIDER_ACTION: "install-native",
  });
});


test("root policy warning is emitted before bridge.runAction", async () => {
  const events: Array<{ type: string; line?: string }> = [];
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider } = createFakeRootProvider({
    requiresRoot: false,
    warning: "[warn] root policy detection failed",
  });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
    emit(event) {
      events.push({
        type: event.type,
        line: event.type === "log" ? event.line : undefined,
      });
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.deepEqual(events, [
    { type: "log", line: "[warn] root policy detection failed" },
    { type: "action:start", line: undefined },
    { type: "action:finish", line: undefined },
  ]);
});

test("root action with requestRootAccess calls requester before bridge.runAction", async () => {
  const order: string[] = [];
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
    requestRootAccess(request) {
      order.push(`request:${request.action.id}:${request.reason}`);
      return { ok: true };
    },
  });

  const originalRunAction = bridge.runAction.bind(bridge);
  bridge.runAction = async (actionId, context) => {
    order.push(`run:${actionId}`);
    return originalRunAction(actionId, context);
  };

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.deepEqual(order, [
    "request:install-native:test requires root",
    "run:install-native",
  ]);
});

test("requestRootAccess failure prevents bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
    requestRootAccess() {
      return { ok: false, code: 23, message: "interactive auth rejected" };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: 23,
    status: "failed",
    message: "interactive auth rejected",
  });
  assert.equal(runCalls.length, 0);
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
  ]);
});

test("requestRootAccess canceled returns canceled and prevents bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
    requestRootAccess() {
      return {
        ok: false,
        code: c420uiExitCodes.canceled,
        message: "interactive auth canceled",
      };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: c420uiExitCodes.canceled,
    status: "canceled",
    message: "interactive auth canceled",
  });
  assert.equal(runCalls.length, 0);
});

test("requestRootAccess success passes returned env to bridge.runAction", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
    env: { BASE_ENV: "1" } as NodeJS.ProcessEnv,
    requestRootAccess() {
      return { ok: true, env: { AUTH_ENV: "from-requester" } };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.deepEqual(runCalls[0]?.context.env, { AUTH_ENV: "from-requester" });
});

test("CLI non-interactive path still uses validateRootAccess when no requester exists", async () => {
  const { bridge, runCalls } = createFakeBridge({ actions: [rootAction] });
  const { provider, calls } = createFakeRootProvider({ requiresRoot: true });
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.ok(calls.includes("validateRootAccess"));
});
