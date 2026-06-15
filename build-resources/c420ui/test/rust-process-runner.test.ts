import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildC420UIRustProcessEnv,
  runC420UIRustProcess,
  type c420uiLogEvent,
  type c420uiProgressEvent,
} from "../src/index.js";

function makeHostStub(script: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-process-host-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${script}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function createRunOptions(hostBin: string, overrides: Partial<Parameters<typeof runC420UIRustProcess>[0]> = {}) {
  const logs: c420uiLogEvent[] = [];
  const progress: c420uiProgressEvent[] = [];
  return {
    options: {
      rootDir: process.cwd(),
      command: "echo",
      args: ["hello"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH, C420UI_HOST_BIN: hostBin, SECRET_TOKEN: "blocked" },
      label: "Test command",
      emitLog(event: c420uiLogEvent) {
        logs.push(event);
      },
      emitProgress(event: c420uiProgressEvent) {
        progress.push(event);
      },
      ...overrides,
    },
    logs,
    progress,
  };
}

test("stdout JSONL becomes operational stdout log", async () => {
  const hostBin = makeHostStub(`
read config
printf '%s\n' '{"event":"started","pid":123}' '{"event":"stdout","line":"hello"}' '{"event":"exit","code":0}'
`);
  const { options, logs } = createRunOptions(hostBin);

  const result = await runC420UIRustProcess(options);

  assert.equal(result.status, "success");
  assert.ok(logs.some((event) => event.source === "stdout" && event.line === "hello"));
});

test("stderr JSONL becomes operational stderr log", async () => {
  const hostBin = makeHostStub(`
read config
printf '%s\n' '{"event":"started","pid":123}' '{"event":"stderr","line":"warning"}' '{"event":"exit","code":0}'
`);
  const { options, logs } = createRunOptions(hostBin);

  const result = await runC420UIRustProcess(options);

  assert.equal(result.status, "success");
  assert.ok(logs.some((event) => event.source === "stderr" && event.line === "warning"));
});

test("exit 0 becomes success", async () => {
  const hostBin = makeHostStub(`
read config
printf '%s\n' '{"event":"started","pid":123}' '{"event":"exit","code":0}'
`);
  const { options, progress } = createRunOptions(hostBin);

  const result = await runC420UIRustProcess(options);

  assert.equal(result.status, "success");
  assert.equal(result.code, 0);
  assert.equal(progress.at(-1)?.state, "success");
});

test("exit non-zero becomes failed", async () => {
  const hostBin = makeHostStub(`
read config
printf '%s\n' '{"event":"started","pid":123}' '{"event":"exit","code":7}'
`);
  const { options, progress } = createRunOptions(hostBin);

  const result = await runC420UIRustProcess(options);

  assert.equal(result.status, "failed");
  assert.equal(result.code, 7);
  assert.equal(progress.at(-1)?.state, "failed");
});

test("error event becomes failed result", async () => {
  const hostBin = makeHostStub(`
read config
printf '%s\n' '{"event":"error","message":"Failed to start process: missing"}'
exit 1
`);
  const { options, logs } = createRunOptions(hostBin);

  const result = await runC420UIRustProcess(options);

  assert.equal(result.status, "failed");
  assert.ok(logs.some((event) => event.source === "action" && event.level === "error"));
});

test("abort sends cancel event and maps canceled", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-cancel-${process.pid}.jsonl`);
  const hostBin = makeHostStub(`
read config
read cancel
printf '%s\n' "$cancel" > ${JSON.stringify(capturePath)}
printf '%s\n' '{"event":"canceled","message":"Action canceled."}'
exit 130
`);
  const controller = new AbortController();
  const { options } = createRunOptions(hostBin, { signal: controller.signal });

  const running = runC420UIRustProcess(options);
  controller.abort();
  const result = await running;

  assert.equal(result.status, "canceled");
  assert.equal(result.code, 130);
  assert.deepEqual(JSON.parse(fs.readFileSync(capturePath, "utf8")), { event: "cancel" });
});

test("buildC420UIRustProcessEnv does not pass secrets", () => {
  const env = buildC420UIRustProcessEnv({
    PATH: "/usr/bin",
    HOME: "/home/user",
    GITHUB_TOKEN: "secret",
    SECRET_TOKEN: "secret",
    npm_config_cache: "/tmp/npm",
  });

  assert.deepEqual(env, {
    PATH: "/usr/bin",
    HOME: "/home/user",
    npm_config_cache: "/tmp/npm",
  });
});
