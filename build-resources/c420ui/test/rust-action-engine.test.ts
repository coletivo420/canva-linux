import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createC420UIRustActionEngine,
  c420uiExitCodes,
  type C420UIEvent,
  type c420uiAction,
  type c420uiProjectBridge,
} from "../src/index.js";

function makeRustHostStub(source: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-action-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${source}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function createAction(overrides: Partial<c420uiAction> = {}): c420uiAction {
  return {
    id: "doctor",
    label: "Doctor",
    group: "validation",
    kind: "command",
    command: "node",
    args: ["doctor.mjs"],
    ...overrides,
  };
}

function createBridge(action = createAction()): c420uiProjectBridge {
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
      throw new Error("legacy TypeScript action execution must not be called");
    },
  };
}

test("runActionById calls c420ui-host action-run --json-lines", async () => {
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-action-capture-"));
  const argsPath = path.join(captureDir, "args.txt");
  const inputPath = path.join(captureDir, "input.json");
  const binPath = makeRustHostStub(`
printf '%s' "$*" > ${JSON.stringify(argsPath)}
read input
printf '%s' "$input" > ${JSON.stringify(inputPath)}
printf '%s\\n' '{"event":"action:start","actionId":"doctor","message":"Doctor","data":{"dryRun":false}}'
printf '%s\\n' '{"event":"log","source":"stdout","line":"ok"}'
printf '%s\\n' '{"event":"progress","state":"running","label":"Doctor"}'
printf '%s\\n' '{"event":"action:finish","actionId":"doctor","status":"success","code":0}'
`);
  const events: C420UIEvent[] = [];
  const engine = createC420UIRustActionEngine({
    bridge: createBridge(),
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    emit(event) {
      events.push(event);
    },
  });

  const result = await engine.runActionById("doctor", { yes: true });

  assert.deepEqual(result, { code: 0, status: "success" });
  assert.equal(fs.readFileSync(argsPath, "utf8"), "action-run --json-lines");
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  assert.equal(input.actionId, "doctor");
  assert.equal(input.actions[0].command, "node");
  assert.deepEqual(events.map((event) => event.type), [
    "action:start",
    "log",
    "progress",
    "action:finish",
  ]);
});

test("root-request calls requestRootAccess and sends root-response without logging env", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-root-response-${process.pid}.jsonl`);
  const binPath = makeRustHostStub(`
read input
printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"doctor","reason":"Need root"}'
read response
printf '%s\\n' "$response" > ${JSON.stringify(capturePath)}
printf '%s\\n' '{"event":"action:finish","actionId":"doctor","status":"success","code":0}'
`);
  const events: C420UIEvent[] = [];
  const engine = createC420UIRustActionEngine({
    bridge: createBridge(createAction({ requiresRoot: true })),
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
    emit(event) {
      events.push(event);
    },
    requestRootAccess(request) {
      assert.equal(request.reason, "Need root");
      return { ok: true, env: { SECRET_ROOT_ENV: "do-not-log" } };
    },
  });

  const result = await engine.runActionById("doctor", { yes: true });
  const response = fs.readFileSync(capturePath, "utf8");

  assert.equal(result.status, "success");
  assert.match(response, /"accepted":true/);
  assert.match(response, /SECRET_ROOT_ENV/);
  assert.doesNotMatch(JSON.stringify(events), /do-not-log/);
});

test("AbortController sends cancel to action-run", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-cancel-${process.pid}.jsonl`);
  const binPath = makeRustHostStub(`
read input
read cancel
printf '%s\\n' "$cancel" > ${JSON.stringify(capturePath)}
printf '%s\\n' '{"event":"action:finish","actionId":"doctor","status":"canceled","code":130}'
`);
  const engine = createC420UIRustActionEngine({
    bridge: createBridge(),
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
  });
  const controller = new AbortController();
  const resultPromise = engine.runActionById("doctor", {
    yes: true,
    signal: controller.signal,
  });

  controller.abort();
  const result = await resultPromise;

  assert.deepEqual(result, {
    code: c420uiExitCodes.canceled,
    status: "canceled",
  });
  assert.match(fs.readFileSync(capturePath, "utf8"), /"event":"cancel"/);
});
