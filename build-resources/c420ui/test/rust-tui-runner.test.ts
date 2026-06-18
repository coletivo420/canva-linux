import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { PassThrough } from "node:stream";
import test from "node:test";

import type { c420uiAction } from "../src/actions.js";
import type { c420uiExecutionContext, c420uiProjectBridge } from "../src/bridge.js";
import { c420uiExitCodes } from "../src/exit-codes.js";
import type { c420uiRootProvider } from "../src/root-provider.js";
import {
  runC420UIRustTuiApp,
  type C420UIRustTuiRunnerOptions,
} from "../src/rust-tui-runner.js";
import type { C420UIAppOptions } from "../src/terminal/app.js";

class FakeTuiProcess extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
}

function createAction(overrides: Partial<c420uiAction> = {}): c420uiAction {
  return {
    id: "install-native",
    label: "Install native",
    group: "install",
    kind: "internal",
    ...overrides,
  };
}

function createRunnerOptions(
  overrides: Partial<C420UIAppOptions> & {
    actions?: c420uiAction[];
    runAction?: (
      actionId: string,
      context: c420uiExecutionContext,
    ) => ReturnType<c420uiProjectBridge["runAction"]>;
  } = {},
): C420UIAppOptions {
  const actions = overrides.actions ?? [createAction()];
  const bridge: c420uiProjectBridge = {
    id: "example-project",
    projectInfo() {
      return { projectName: "Example Project" };
    },
    actions() {
      return actions;
    },
    artifactWorkflows() {
      return [];
    },
    runAction:
      overrides.runAction ??
      (async (_actionId, context) => {
        context.emitLog({ source: "stdout", line: "running" });
        context.emitProgress({ state: "running", label: "Working" });
        return { code: 0, status: "success", message: "done" };
      }),
  };

  return {
    config: {
      rootDir: "/repo",
      title: "Example Project Tool",
      brand: { name: "c420ui", version: "0.1.0", logoLines: [] },
      project: {
        projectName: "Example Project",
        projectSubtitle: "Example subtitle",
        displayVersion: "0.1.4-14",
        phase: "0.1.4-14",
        status: "dev",
        logoLines: [],
        appId: "example.project",
        executableName: "example-project",
        repositoryUrl: "https://example.invalid/project",
        launcherCommand: "./example-project.sh",
        stateDirectoryName: "example-project",
      },
      releaseNotes: "Example release notes",
    },
    bridge,
    rootProvider: overrides.rootProvider,
    startupTasks: overrides.startupTasks,
  };
}

type StartRunnerOptions = Partial<C420UIRustTuiRunnerOptions> & {
  actions?: c420uiAction[];
  runAction?: (
    actionId: string,
    context: c420uiExecutionContext,
  ) => ReturnType<c420uiProjectBridge["runAction"]>;
};

function startRunner(options: StartRunnerOptions = {}) {
  const child = new FakeTuiProcess();
  const writes: string[] = [];
  const spawnCalls: Array<{
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
  }> = [];

  child.stdin.on("data", (chunk) => {
    for (const line of String(chunk).split(/\n/)) {
      if (line.trim()) writes.push(line.trim());
    }
  });

  const exitCodes: number[] = [];
  runC420UIRustTuiApp({
    ...createRunnerOptions(options),
    env: { PATH: "/usr/bin", SECRET: "do-not-forward", TERM: "xterm-256color" },
    resolveBinary: () => "/tmp/c420ui-tui",
    spawnProcess(command, args, spawnOptions) {
      spawnCalls.push({ command, args, env: spawnOptions.env });
      return child;
    },
    exit(code) {
      exitCodes.push(code);
      throw new Error(`exit ${code}`);
    },
    ...options,
  });

  return { child, writes, spawnCalls, exitCodes };
}

async function waitFor<T>(
  read: () => T | undefined,
  label: string,
): Promise<T> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function parseWrites(writes: string[]): Array<Record<string, unknown>> {
  return writes.map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("runner starts c420ui-tui run --json-lines and sends initial state", async () => {
  const { writes, spawnCalls } = startRunner();

  assert.equal(spawnCalls[0]?.command, "/tmp/c420ui-tui");
  assert.deepEqual(spawnCalls[0]?.args, ["run", "--json-lines"]);
  assert.equal(spawnCalls[0]?.env.PATH, "/usr/bin");
  assert.equal(spawnCalls[0]?.env.SECRET, undefined);

  const init = await waitFor(
    () => parseWrites(writes).find((event) => event.event === "init"),
    "init event",
  );
  assert.equal((init.state as { project: { name: string } }).project.name, "Example Project");
});

test("runner maps action-selected to Action Engine execution and forwards events", async () => {
  let ranAction = false;
  const { child, writes } = startRunner({
    runAction: async (_actionId, context) => {
      ranAction = true;
      context.emitLog({ source: "stdout", line: "started" });
      context.emitProgress({ state: "running", label: "Halfway" });
      return { code: 0, status: "success", message: "done" };
    },
  });

  child.stdout.write('{"event":"action-selected","actionId":"install-native"}\n');

  await waitFor(() => (ranAction ? true : undefined), "action execution");
  const events = parseWrites(writes);
  assert.ok(events.some((event) => event.event === "action-start"));
  assert.ok(events.some((event) => event.event === "log" && event.line === "started"));
  assert.ok(events.some((event) => event.event === "progress" && event.label === "Halfway"));
  assert.ok(events.some((event) => event.event === "action-finish"));
});

test("runner handles quit from c420ui-tui", async () => {
  const { child, exitCodes } = startRunner({
    exit(code) {
      exitCodes.push(code);
      return undefined as never;
    },
  });

  assert.doesNotThrow(() => child.stdout.write('{"event":"quit"}\n'));
  await waitFor(() => exitCodes[0], "quit exit");
  assert.equal(exitCodes[0], c420uiExitCodes.success);
});

test("runner handles root requests through the root provider", async () => {
  let actionEnv: NodeJS.ProcessEnv | undefined;
  let validatedRoot = false;
  const rootProvider: c420uiRootProvider = {
    id: "test-root",
    label: "Test Root",
    buildActionEnvironment(_action, baseEnv) {
      return { ...baseEnv, ACTION_ENV: "1" };
    },
    validateActionScope() {
      return { ok: true };
    },
    resolveRootPolicy() {
      return { requiresRoot: true, reason: "System install requires root" };
    },
    validateRootAccess() {
      validatedRoot = true;
      return { ok: true };
    },
    buildRootActionEnvironment(_action, env) {
      return { ...env, ROOT_ENV: "1" };
    },
  };

  const { child, writes } = startRunner({
    actions: [createAction({ requiresRoot: true })],
    rootProvider,
    runAction: async (_actionId, context) => {
      actionEnv = context.env;
      return { code: 0, status: "success", message: "done" };
    },
  });

  child.stdout.write('{"event":"action-selected","actionId":"install-native"}\n');
  const rootRequest = await waitFor(
    () => parseWrites(writes).find((event) => event.event === "root-request"),
    "root request",
  );
  child.stdout.write(
    `${JSON.stringify({
      event: "root-request-response",
      requestId: rootRequest.requestId,
      accepted: true,
    })}\n`,
  );

  await waitFor(() => actionEnv, "root action env");
  assert.equal(validatedRoot, true);
  assert.equal(actionEnv?.ROOT_ENV, "1");
});

test("runner fails clearly when c420ui-tui is missing", () => {
  const messages: string[] = [];
  const exitCodes: number[] = [];

  assert.throws(
    () =>
      runC420UIRustTuiApp({
        ...createRunnerOptions(),
        resolveBinary() {
          throw new Error("Missing c420ui-tui binary. Run npm run build:c420ui-tui.");
        },
        writeError(message) {
          messages.push(message);
        },
        exit(code) {
          exitCodes.push(code);
          throw new Error(`exit ${code}`);
        },
      }),
    /exit/,
  );

  assert.match(messages[0] ?? "", /Missing c420ui-tui binary/);
  assert.equal(exitCodes[0], c420uiExitCodes.generalError);
});

test("runner has no optional backend switch and does not depend on blessed", () => {
  const source = fs.readFileSync(
    "build-resources/c420ui/src/rust-tui-runner.ts",
    "utf8",
  );
  const forbidden = ["C420UI", "TUI", "BACKEND"].join("_");

  assert.equal(source.includes(forbidden), false);
  assert.equal(source.includes("blessed"), false);
});
