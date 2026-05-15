import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
  type c420uiAction,
  type c420uiProjectBridge,
  type c420uiRootProvider,
} from "../packages/c420ui/src";

const rootAction: c420uiAction = {
  id: "install-native",
  label: "Install Native",
  group: "install",
  kind: "command",
  requiresRoot: true,
};

function createBridge() {
  const runCalls: NodeJS.ProcessEnv[] = [];
  const bridge: c420uiProjectBridge = {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return [rootAction];
    },
    artifactWorkflows() {
      return [];
    },
    async runAction(_actionId, context) {
      runCalls.push(context.env);
      return { code: c420uiExitCodes.success, status: "success", message: "ok" };
    },
  };
  return { bridge, runCalls };
}

function createRootProvider(calls: string[]): c420uiRootProvider {
  return {
    id: "fake-root-provider",
    label: "Fake root provider",
    buildActionEnvironment(_action, env) {
      calls.push("buildActionEnvironment");
      return { ...env, ACTION_ENV: "1" };
    },
    validateActionScope() {
      calls.push("validateActionScope");
      return { ok: true };
    },
    resolveRootPolicy() {
      calls.push("resolveRootPolicy");
      return { requiresRoot: true, reason: "test requires root" };
    },
    validateRootAccess() {
      calls.push("validateRootAccess");
      return { ok: true };
    },
    buildRootActionEnvironment(_action, env) {
      calls.push("buildRootActionEnvironment");
      return { ...env, ROOT_ENV: "1" };
    },
  };
}

test("requestRootAccess ok=true allows bridge.runAction", async () => {
  const calls: string[] = [];
  const { bridge, runCalls } = createBridge();
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: createRootProvider(calls),
    requestRootAccess() {
      calls.push("requestRootAccess");
      return { ok: true };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "requestRootAccess",
    "buildRootActionEnvironment",
  ]);
});

test("requestRootAccess ok=true with env applies returned env", async () => {
  const calls: string[] = [];
  const { bridge, runCalls } = createBridge();
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: createRootProvider(calls),
    requestRootAccess() {
      return { ok: true, env: { AUTH_ENV: "from-requester" } };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.deepEqual(runCalls[0], { AUTH_ENV: "from-requester" });
  assert.equal(calls.includes("buildRootActionEnvironment"), false);
});

test("requestRootAccess ok=false code=canceled does not call bridge.runAction", async () => {
  const calls: string[] = [];
  const { bridge, runCalls } = createBridge();
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: createRootProvider(calls),
    requestRootAccess() {
      return { ok: false, code: c420uiExitCodes.canceled, message: "canceled" };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: c420uiExitCodes.canceled,
    status: "canceled",
    message: "canceled",
  });
  assert.equal(runCalls.length, 0);
});

test("requestRootAccess ok=false code=generalError does not call bridge.runAction", async () => {
  const calls: string[] = [];
  const { bridge, runCalls } = createBridge();
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: createRootProvider(calls),
    requestRootAccess() {
      return { ok: false, code: c420uiExitCodes.generalError, message: "failed" };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: c420uiExitCodes.generalError,
    status: "failed",
    message: "failed",
  });
  assert.equal(runCalls.length, 0);
});

test("without requestRootAccess uses validateRootAccess", async () => {
  const calls: string[] = [];
  const { bridge, runCalls } = createBridge();
  const engine = createC420UIActionEngine({
    bridge,
    rootDir: "/repo",
    rootProvider: createRootProvider(calls),
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.equal(result.status, "success");
  assert.equal(runCalls.length, 1);
  assert.equal(calls.includes("validateRootAccess"), true);
});
