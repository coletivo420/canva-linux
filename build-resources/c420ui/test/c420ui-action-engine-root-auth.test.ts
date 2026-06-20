import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
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
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-root-auth-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${source}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function createBridge(): c420uiProjectBridge {
  return {
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
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by root auth");
    },
  };
}

function createRootProvider(): c420uiRootProvider {
  return {
    id: "fake-root-provider",
    label: "Fake root provider",
    buildActionEnvironment(_action, env) {
      return { ...env, ACTION_ENV: "1" };
    },
    validateActionScope() {
      return { ok: true };
    },
    resolveRootPolicy() {
      return { requiresRoot: true, reason: "test requires root" };
    },
    validateRootAccess() {
      return { ok: true };
    },
    buildRootActionEnvironment(_action, env) {
      return { ...env, ROOT_ENV: "1" };
    },
  };
}

test("requestRootAccess ok=true sends accepted root-response to Rust", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-root-auth-${process.pid}.json`);
  const binPath = makeRustHostStub(`
read input
printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"install-native","reason":"Need root"}'
read response
printf '%s' "$response" > ${JSON.stringify(capturePath)}
printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"success","code":0}'
`);
  const engine = createC420UIActionEngine({
    bridge: createBridge(),
    rootDir: "/repo",
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    rootProvider: createRootProvider(),
    requestRootAccess(request) {
      assert.equal(request.reason, "Need root");
      return { ok: true, env: { AUTH_ENV: "from-requester" } };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });
  const response = JSON.parse(fs.readFileSync(capturePath, "utf8"));

  assert.deepEqual(result, { code: c420uiExitCodes.success, status: "success" });
  assert.equal(response.accepted, true);
  assert.equal(response.env.AUTH_ENV, "from-requester");
});

test("requestRootAccess ok=false sends rejected response and returns canceled", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-root-auth-reject-${process.pid}.json`);
  const binPath = makeRustHostStub(`
read input
printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"install-native","reason":"Need root"}'
read response
printf '%s' "$response" > ${JSON.stringify(capturePath)}
printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"canceled","code":130}'
`);
  const engine = createC420UIActionEngine({
    bridge: createBridge(),
    rootDir: "/repo",
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    rootProvider: createRootProvider(),
    requestRootAccess() {
      return { ok: false, code: c420uiExitCodes.canceled, message: "canceled" };
    },
  });

  const result = await engine.runAction(rootAction, { yes: true });
  const response = JSON.parse(fs.readFileSync(capturePath, "utf8"));

  assert.deepEqual(result, {
    code: c420uiExitCodes.canceled,
    status: "canceled",
  });
  assert.equal(response.accepted, false);
  assert.deepEqual(response.env, {});
});
