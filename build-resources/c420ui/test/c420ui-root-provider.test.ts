import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
  type C420UIEvent,
  type c420uiAction,
  type c420uiProjectBridge,
  type c420uiRootProvider,
} from "../src/index.js";

const rootAction: c420uiAction = {
  id: "install-native",
  label: "Install Native",
  group: "install",
  kind: "command",
  command: "/bin/true",
  requiresRoot: true,
};

function makeRustHostStub(source: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-root-host-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${source}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function createBridge(action: c420uiAction = rootAction): c420uiProjectBridge {
  return {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return [action];
    },
    artifactWorkflows() {
      return [];
    },
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by the Rust action engine");
    },
  };
}

function createRootProvider(calls: string[]): c420uiRootProvider {
  return {
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
      return { requiresRoot: true, reason: "test requires root" };
    },
    validateRootAccess() {
      calls.push("validateRootAccess");
      return { ok: true };
    },
    buildRootActionEnvironment(_action, actionEnv) {
      calls.push("buildRootActionEnvironment");
      return { ...actionEnv, ROOT_ENV: "1" };
    },
  };
}

test("root provider prepares policy before Rust host root request", async () => {
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-root-capture-"));
  const initialPath = path.join(captureDir, "initial.json");
  const responsePath = path.join(captureDir, "response.json");
  const binPath = makeRustHostStub(`
read input
printf '%s' "$input" > ${JSON.stringify(initialPath)}
printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"install-native","reason":"test requires root"}'
read response
printf '%s' "$response" > ${JSON.stringify(responsePath)}
printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"success","code":0}'
`);
  const calls: string[] = [];
  const events: C420UIEvent[] = [];
  const engine = createC420UIActionEngine({
    bridge: createBridge(),
    rootDir: "/repo",
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH, BASE_ENV: "1" },
    rootProvider: createRootProvider(calls),
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });
  const initial = JSON.parse(fs.readFileSync(initialPath, "utf8"));
  const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));

  assert.equal(result.status, "success");
  assert.deepEqual(calls, [
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "buildRootActionEnvironment",
    "validateRootAccess",
    "buildRootActionEnvironment",
  ]);
  assert.equal(initial.rootPolicy.requiresRoot, true);
  assert.equal(initial.rootPolicy.reason, "test requires root");
  assert.equal(initial.env.ROOT_PROVIDER_ACTION, "install-native");
  assert.equal(response.accepted, true);
  assert.equal(response.env.ROOT_ENV, "1");
  assert.doesNotMatch(JSON.stringify(events), /ROOT_ENV/);
});

test("validateActionScope failure prevents Rust host execution", async () => {
  const calls: string[] = [];
  const provider: c420uiRootProvider = {
    ...createRootProvider(calls),
    validateActionScope() {
      calls.push("validateActionScope");
      return { ok: false, code: 64, message: "scope rejected" };
    },
  };
  const binPath = makeRustHostStub("echo 'host should not run' >&2\nexit 99");
  const engine = createC420UIActionEngine({
    bridge: createBridge(),
    rootDir: "/repo",
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    rootProvider: provider,
  });

  const result = await engine.runAction(rootAction, { yes: true });

  assert.deepEqual(result, {
    code: 64,
    status: "failed",
    message: "scope rejected",
  });
  assert.deepEqual(calls, ["buildActionEnvironment", "validateActionScope"]);
});

test("requestRootAccess failure is returned without logging secret data", async () => {
  const binPath = makeRustHostStub(`
read input
printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"install-native","reason":"Need root"}'
read response
if printf '%s' "$response" | grep -q '"accepted":false'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"canceled","code":130}'
  exit 130
fi
printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"success","code":0}'
`);
  const calls: string[] = [];
  const events: C420UIEvent[] = [];
  const engine = createC420UIActionEngine({
    bridge: createBridge(),
    rootDir: "/repo",
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    rootProvider: createRootProvider(calls),
    emit(event) {
      events.push(event);
    },
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
  });
  assert.doesNotMatch(JSON.stringify(events), /interactive auth canceled/);
});
