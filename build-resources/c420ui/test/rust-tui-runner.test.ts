import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test, { afterEach } from "node:test";

import type { c420uiAction } from "../src/actions.js";
import type { c420uiProjectBridge } from "../src/bridge.js";
import { c420uiExitCodes } from "../src/exit-codes.js";
import type { c420uiRootProvider } from "../src/root-provider.js";
import {
  runC420UIRustTuiApp,
  type C420UIRustTuiRunnerOptions,
} from "../src/rust-tui-runner.js";
import type { C420UIAppOptions } from "../src/terminal/app-options.js";

class FakeTuiProcess extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  #closed = false;

  close(code: number | null = 0): void {
    if (this.#closed) return;
    this.#closed = true;
    this.stdin.removeAllListeners("data");
    this.stdout.removeAllListeners("data");
    this.stdin.write = (() => true) as typeof this.stdin.write;
    this.stdout.write = (() => true) as typeof this.stdout.write;
    this.stdin.end();
    this.stdout.end();
    this.emit("close", code);
  }
}

const activeFakeTuiProcesses = new Set<FakeTuiProcess>();

afterEach(() => {
  for (const child of activeFakeTuiProcesses) {
    child.close();
  }
  activeFakeTuiProcesses.clear();
});

function createAction(overrides: Partial<c420uiAction> = {}): c420uiAction {
  return {
    id: "install-native",
    label: "Install native",
    group: "install",
    kind: "command",
    command: "node",
    args: ["install-native.mjs"],
    ...overrides,
  };
}

function makeRustHostStub(mode = "success"): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-tui-host-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(
    binPath,
    `#!/bin/sh
if [ "$1" = "status-panels" ]; then
  cat >/dev/null
  printf '%s\\n' '{"ok":true,"command":"status-panels","panels":{"detectedInstallations":{"label":"Detected Installations","lines":[{"label":"Native System","value":"not detected","state":"not-detected"}]},"generatedArtifacts":{"label":"Generated Artifacts","lines":[{"label":"AppImage","value":"loading...","state":"loading"}]},"linuxArtifacts":{"label":"Linux Artifacts","lines":[{"label":"Electron","value":"loading...","state":"loading"},{"label":"Node","value":"loading...","state":"loading"},{"label":"npm","value":"loading...","state":"loading"},{"label":"Linux unpacked","value":"loading...","state":"loading"}]},"content":{"label":"Overview","lines":[]}},"diagnostics":[]}'
  exit 0
fi
read input
if printf '%s' "$input" | grep -q '"requiresRoot":true'; then
  printf '%s\\n' '{"event":"root-request","requestId":"root-1","actionId":"install-native","reason":"System install requires root"}'
  read root_response
fi
printf '%s\\n' '{"event":"action:start","actionId":"install-native","message":"Install native","data":{"dryRun":false}}'
printf '%s\\n' '{"event":"log","source":"stdout","line":"started"}'
printf '%s\\n' '{"event":"progress","state":"running","label":"Halfway"}'
if [ "${mode}" = "wait" ]; then
  read cancel
  printf '%s\\n' '{"event":"progress","state":"interrupted","label":"Interrupted"}'
  printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"canceled","code":130}'
else
  printf '%s\\n' '{"event":"action:finish","actionId":"install-native","status":"success","code":0}'
fi
`,
  );
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function createRunnerOptions(
  overrides: Partial<C420UIAppOptions> & {
    actions?: c420uiAction[];
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
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by the Rust TUI runner");
    },
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
};

function startRunner(options: StartRunnerOptions = {}) {
  const child = new FakeTuiProcess();
  activeFakeTuiProcesses.add(child);
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
  const rustHostBin =
    options.env?.C420UI_HOST_BIN ??
    makeRustHostStub(options.env?.C420UI_TEST_ACTION_MODE);
  runC420UIRustTuiApp({
    ...createRunnerOptions(options),
    ...options,
    env: {
      PATH: "/usr/bin",
      SECRET: "do-not-forward",
      TERM: "xterm-256color",
      C420UI_HOST_BIN: rustHostBin,
      ...options.env,
    },
    resolveBinary: () => "/tmp/c420ui-tui",
    spawnProcess(command, args, spawnOptions) {
      spawnCalls.push({ command, args, env: spawnOptions.env });
      return child;
    },
    exit: options.exit ?? ((code) => {
      exitCodes.push(code);
      throw new Error(`exit ${code}`);
    }),
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
  const { child, writes } = startRunner();

  child.stdout.write('{"event":"action-selected","actionId":"install-native"}\n');

  await waitFor(
    () =>
      parseWrites(writes).some((event) => event.event === "action-finish")
        ? true
        : undefined,
    "action execution",
  );
  const events = parseWrites(writes);
  assert.ok(events.some((event) => event.event === "action-start"));
  assert.ok(events.some((event) => event.event === "log" && event.line === "started"));
  assert.ok(events.some((event) => event.event === "progress" && event.label === "Halfway"));
  assert.ok(events.some((event) => event.event === "action-finish"));
});

test("runner writes session log and refreshes panels after actions", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-runner-"));
  const sessionLogPath = path.join(tempDir, "tool-session.log");
  let overviewCalls = 0;
  const options = createRunnerOptions();
  options.config.sessionLogPath = sessionLogPath;
  options.bridge.overviewStatus = async () => {
    overviewCalls += 1;
    return null;
  };
  const { child, writes } = startRunner(options);

  child.stdout.write('{"event":"action-selected","actionId":"install-native"}\n');

  await waitFor(
    () =>
      parseWrites(writes).some(
        (event) => event.event === "state" && overviewCalls > 0,
      )
        ? true
        : undefined,
    "post-action state refresh",
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  const sessionLog = fs.readFileSync(sessionLogPath, "utf8");
  assert.match(sessionLog, /\[mode\] c420ui/);
  assert.match(sessionLog, /\[action\] install-native Install native/);
  assert.match(sessionLog, /\[stdout\] started/);
});

test("runner processes interrupt-action and aborts the active action", async () => {
  const { child, writes } = startRunner({
    env: {
      C420UI_TEST_ACTION_MODE: "wait",
    },
  });

  child.stdout.write('{"event":"action-selected","actionId":"install-native"}\n');
  await waitFor(
    () =>
      parseWrites(writes).some((event) => event.event === "action-start")
        ? true
        : undefined,
    "action start",
  );
  child.stdout.write('{"event":"interrupt-action","actionId":"install-native"}\n');

  await waitFor(
    () =>
      parseWrites(writes).some(
        (event) =>
          event.event === "action-finish" &&
          event.actionId === "install-native" &&
          event.status === "canceled",
      )
        ? true
        : undefined,
    "canceled action finish",
  );
  const events = parseWrites(writes);
  assert.ok(
    events.some(
      (event) =>
        event.event === "action-finish" &&
        event.actionId === "install-native" &&
        event.status === "canceled",
    ),
  );
  assert.ok(events.some((event) => event.event === "progress" && event.state === "interrupted"));
});

test("runner processes copy-logs from c420ui-tui", async () => {
  let copiedText = "";
  const { child, writes } = startRunner({
    copyTextToClipboard(text) {
      copiedText = text;
      return { ok: true, message: "Logs copied by test clipboard." };
    },
  });

  child.stdout.write('{"event":"copy-logs"}\n');

  const events = await waitFor(() => {
    const parsed = parseWrites(writes);
    return parsed.find(
      (event) =>
        event.event === "log" && String(event.line).toLowerCase().includes("logs"),
    );
  }, "copy logs response");
  assert.equal(events?.source, "system");
  assert.match(copiedText, /\[mode\] c420ui|c420ui/);
});

test("runner persists setting toggles", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-settings-"));
  const oldConfigHome = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tempDir;
  try {
    const { child, writes } = startRunner();

    child.stdout.write(
      '{"event":"setting-toggle","setting":"terminalTextSelectionMode"}\n',
    );

    const state = await waitFor(
      () =>
        parseWrites(writes).find(
          (event) =>
            event.event === "state" &&
            (event.state as { footer?: { textSelectionMode?: boolean } }).footer
              ?.textSelectionMode === true,
        ),
      "settings state refresh",
    );
    assert.equal(
      (state.state as { footer: { items: string[] } }).footer.items[0],
      "Text selection mode enabled",
    );
    const settingsFile = path.join(
      tempDir,
      "example-project",
      "tool-settings.json",
    );
    assert.match(fs.readFileSync(settingsFile, "utf8"), /terminalTextSelectionMode": true/);
  } finally {
    if (oldConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = oldConfigHome;
    }
  }
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

  await waitFor(
    () =>
      parseWrites(writes).some((event) => event.event === "action-finish")
        ? true
        : undefined,
    "root action finish",
  );
  assert.equal(validatedRoot, true);
});

test("runner retries root input without logging the secret", async () => {
  let attempts = 0;
  const rootProvider: c420uiRootProvider = {
    id: "test-root",
    label: "Test Root",
    buildActionEnvironment(_action, env) {
      return env;
    },
    validateActionScope() {
      return { ok: true };
    },
    resolveRootPolicy() {
      return { requiresRoot: true, reason: "System install requires root" };
    },
    validateRootAccessWithInput(_rootDir, _env, input) {
      attempts += 1;
      if (input === "correct-password") return { ok: true };
      return { ok: false, code: 1, message: "Wrong password" };
    },
    validateRootAccess() {
      return { ok: false, code: 1, message: "Password required" };
    },
    buildRootActionEnvironment(_action, env) {
      return env;
    },
  };
  const { child, writes } = startRunner({
    actions: [createAction({ requiresRoot: true })],
    rootProvider,
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
      input: "wrong-password",
    })}\n`,
  );
  await waitFor(
    () =>
      parseWrites(writes).find(
        (event) => event.event === "root-request-result" && event.ok === false,
      ),
    "failed root request result",
  );
  child.stdout.write(
    `${JSON.stringify({
      event: "root-request-response",
      requestId: rootRequest.requestId,
      accepted: true,
      input: "correct-password",
    })}\n`,
  );

  await waitFor(() => (attempts === 2 ? true : undefined), "root retry");
  const serialized = writes.join("\n");
  assert.equal(serialized.includes("wrong-password"), false);
  assert.equal(serialized.includes("correct-password"), false);
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
