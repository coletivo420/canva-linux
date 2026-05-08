import assert from "node:assert/strict";
import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
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

test("c420ui command runner forwards stdout and returns success", async () => {
  const options = createOptions({
    args: ["-e", "process.stdout.write('hello')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.equal(result.code, 0);
  assert.deepEqual(options.logs, [{ source: "stdout", line: "hello" }]);
});

test("c420ui command runner forwards stderr", async () => {
  const options = createOptions({
    args: ["-e", "process.stderr.write('warning')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.deepEqual(options.logs, [{ source: "stderr", line: "warning" }]);
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
  }) as typeof spawn;
  const options = createOptions({
    spawnCommand,
    args: ["-e", "process.stdout.write('ok')"],
  });

  const result = await runC420UICommand(options);

  assert.equal(result.status, "success");
  assert.equal(observedShell, false);
});
