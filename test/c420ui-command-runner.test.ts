import assert from "node:assert/strict";
import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  runC420UICommand,
  type c420uiCommandRunnerOptions,
  type c420uiLogEvent,
  type c420uiProgressEvent,
} from "../packages/c420ui/src";

function createOptions(
  overrides: Partial<c420uiCommandRunnerOptions> = {},
): c420uiCommandRunnerOptions & {
  logs: c420uiLogEvent[];
  progress: c420uiProgressEvent[];
} {
  const logs: c420uiLogEvent[] = [];
  const progress: c420uiProgressEvent[] = [];
  return {
    command: process.execPath,
    args: [],
    cwd: process.cwd(),
    env: process.env,
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

function logLines(options: { logs: c420uiLogEvent[] }, source: c420uiLogEvent["source"]): string[] {
  return options.logs.filter((event) => event.source === source).map((event) => event.line);
}

test("c420ui command runner forwards stdout and returns success", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('hello')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.equal(result.code, 0);
  assert.deepEqual(logLines(options, "stdout"), ["hello"]);
});

test("c420ui command runner forwards stderr", async () => {
  const options = createOptions({
    args: ["-e", "process.stderr.write('warning')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.deepEqual(logLines(options, "stderr"), ["warning"]);
});

test("c420ui command runner redacts stdout", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('token=abc')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.deepEqual(logLines(options, "stdout"), ["token=[redacted]"]);
});

test("c420ui command runner redacts stderr", async () => {
  const options = createOptions({
    args: ["-e", "process.stderr.write('Bearer abc.def')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.deepEqual(logLines(options, "stderr"), ["Bearer [redacted]"]);
});

test("c420ui command runner emits a start log", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('done')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.ok(options.logs.some((event) => event.source === "action" && event.line === "[action] Starting Test command"));
});

test("c420ui command runner returns failed for non-zero exits", async () => {
  const options = createOptions({
    args: ["-e", "process.exit(7)"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "failed");
  assert.equal(result.code, 7);
  assert.equal(options.progress.at(0)?.state, "running");
  assert.equal(options.progress.at(-1)?.state, "failed");
  assert.ok(options.logs.some((event) => event.source === "action" && event.level === "error" && event.line === "[error] Test command exited with code 7"));
});

test("c420ui command runner returns failed for spawn errors", async () => {
  const options = createOptions({
    command: "definitely-not-a-c420ui-command",
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "failed");
  assert.ok(result.message?.includes("definitely-not-a-c420ui-command"));
  assert.equal(options.progress.at(0)?.state, "running");
  assert.equal(options.progress.at(-1)?.state, "failed");
  assert.ok(options.logs.some((event) => event.source === "action" && event.level === "error" && event.line.includes("[error] Failed to start Test command:")));
});

test("c420ui command runner keeps final chunks without a newline", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('partial'); process.stderr.write('tail')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.ok(options.logs.some((event) => event.source === "stdout" && event.line === "partial"));
  assert.ok(options.logs.some((event) => event.source === "stderr" && event.line === "tail"));
});

test("c420ui command runner emits running before success", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('done')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.equal(options.progress.at(0)?.state, "running");
  assert.equal(options.progress.at(-1)?.state, "success");
  assert.equal(options.progress.at(-1)?.percent, 100);
});

test("c420ui command runner uses shell false", async () => {
  let observedShell: unknown;
  const spawnCommand = ((
    command: string,
    args?: readonly string[] | SpawnOptionsWithoutStdio,
    spawnOptions?: SpawnOptionsWithoutStdio,
  ) => {
    if (Array.isArray(args)) {
      observedShell = spawnOptions?.shell;
      return spawn(command, args, spawnOptions);
    }
    const spawnOptionsOnly = args as SpawnOptionsWithoutStdio | undefined;
    observedShell = spawnOptionsOnly?.shell;
    return spawn(command, spawnOptionsOnly);
  }) as unknown as typeof spawn;
  const options = createOptions({
    spawnCommand,
    args: ["-e", "process.stdout.write('ok')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.equal(observedShell, false);
});

test("c420ui command runner treats external SIGTERM as failure without cancellation", async () => {
  const spawnCommand = (() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill() {
        return true;
      },
    });
    setImmediate(() => child.emit("close", null, "SIGTERM"));
    return child;
  }) as unknown as typeof spawn;
  const options = createOptions({
    spawnCommand,
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "failed");
  assert.equal(result.code, 1);
  assert.equal(options.progress.at(-1)?.state, "failed");
  assert.equal(options.progress.filter((event) => event.state === "canceled").length, 0);
});

test("c420ui command runner cancellation returns canceled and sends SIGINT", async () => {
  const abortController = new AbortController();
  const signals: NodeJS.Signals[] = [];
  let child: EventEmitter & { stdout: PassThrough; stderr: PassThrough; kill(signal?: NodeJS.Signals): boolean };
  const spawnCommand = (() => {
    child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill(signal?: NodeJS.Signals) {
        signals.push(signal ?? "SIGTERM");
        setImmediate(() => child.emit("close", null, signal));
        return true;
      },
    });
    return child;
  }) as unknown as typeof spawn;
  const options = createOptions({
    spawnCommand,
    signal: abortController.signal,
  });

  const running = runC420UICommand(options);
  const keepEventLoopAlive = new Promise((resolve) => setTimeout(resolve, 50));
  abortController.abort();
  const result = await running;
  await keepEventLoopAlive;

  assert.equal(result.status, "canceled");
  assert.equal(result.code, 130);
  assert.deepEqual(signals, ["SIGINT"]);
  assert.equal(options.progress.filter((event) => event.state === "canceled").length, 1);
  assert.ok(options.logs.some((event) => event.source === "action" && event.line === "[action] Cancel requested for Test command"));
});

test("c420ui command runner cancellation falls back to SIGTERM when child does not close", async () => {
  const abortController = new AbortController();
  const signals: NodeJS.Signals[] = [];
  let child: EventEmitter & { stdout: PassThrough; stderr: PassThrough; kill(signal?: NodeJS.Signals): boolean };
  const spawnCommand = (() => {
    child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill(signal?: NodeJS.Signals) {
        signals.push(signal ?? "SIGTERM");
        if (signal === "SIGTERM") {
          setImmediate(() => child.emit("close", null, signal));
        }
        return true;
      },
    });
    return child;
  }) as unknown as typeof spawn;
  const options = createOptions({
    spawnCommand,
    signal: abortController.signal,
    cancelKillTimeoutMs: 5,
  });

  const running = runC420UICommand(options);
  const keepEventLoopAlive = new Promise((resolve) => setTimeout(resolve, 50));
  abortController.abort();
  const result = await running;
  await keepEventLoopAlive;

  assert.equal(result.status, "canceled");
  assert.deepEqual(signals, ["SIGINT", "SIGTERM"]);
  assert.equal(options.progress.filter((event) => event.state === "canceled").length, 1);
});
