import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  runC420UICommand,
  type c420uiCommandRunnerOptions,
  type c420uiLogEvent,
  type c420uiProgressEvent,
} from "../src/index.js";

function createOptions(
  overrides: Partial<c420uiCommandRunnerOptions> = {},
): c420uiCommandRunnerOptions & {
  logs: c420uiLogEvent[];
  progress: c420uiProgressEvent[];
} {
  const logs: c420uiLogEvent[] = [];
  const progress: c420uiProgressEvent[] = [];
  return {
    command: "npm",
    args: ["ci"],
    cwd: process.cwd(),
    env: { PATH: process.env.PATH, SECRET_TOKEN: "must-not-pass" },
    label: "Test command",
    emitLog(event) {
      logs.push(event);
    },
    emitProgress(event) {
      progress.push(event);
    },
    logs,
    progress,
    ...overrides,
  };
}

test("runC420UICommand delegates to Rust process runner", async () => {
  let observed: unknown;
  const options = createOptions({
    processRunner: async (runnerOptions) => {
      observed = runnerOptions;
      return { code: 0, status: "success" };
    },
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.deepEqual(observed, {
    rootDir: process.cwd(),
    command: "npm",
    args: ["ci"],
    cwd: process.cwd(),
    env: options.env,
    label: "Test command",
    signal: undefined,
    timeoutMs: undefined,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress,
  });
});

test("runC420UICommand propagates failed runner result", async () => {
  const options = createOptions({
    processRunner: async () => ({ code: 7, status: "failed" }),
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "failed");
  assert.equal(result.code, 7);
});

test("runC420UICommand propagates canceled runner result", async () => {
  const options = createOptions({
    processRunner: async () => ({ code: 130, status: "canceled", message: "Action canceled." }),
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "canceled");
  assert.equal(result.code, 130);
});

test("command-runner does not import node:child_process", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/command-runner.ts"),
    "utf8",
  );

  assert.equal(source.includes("node:child_process"), false);
});

test("command-runner does not expose spawnCommand fallback", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/command-runner.ts"),
    "utf8",
  );

  assert.equal(source.includes("spawnCommand"), false);
});
