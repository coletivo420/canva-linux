import assert from "node:assert/strict";
import test from "node:test";

import {
  c420uiExitCodes,
  runC420UICli,
  type c420uiAction,
  type c420uiActionResult,
  type c420uiExecutionContext,
  type c420uiProjectBridge,
} from "../packages/c420ui/src";

function createFakeBridge(options?: { result?: c420uiActionResult }) {
  const runCalls: Array<{ actionId: string; context: c420uiExecutionContext }> = [];
  const actions: Array<c420uiAction | (c420uiAction & { cli: string[] })> = [
    {
      id: "doctor",
      label: "Doctor",
      group: "validation",
      kind: "command",
      cliFlags: ["--doctor"],
    },
    {
      id: "legacy",
      label: "Legacy",
      group: "maintenance",
      kind: "command",
      cli: ["--legacy"],
    } as c420uiAction & { cli: string[] },
    {
      id: "clean",
      label: "Clean",
      group: "maintenance",
      kind: "command",
      cliFlags: ["--clean"],
    },
    {
      id: "purge",
      label: "Purge",
      group: "maintenance",
      kind: "command",
      cliFlags: ["--purge"],
    },
    {
      id: "bundle-deb",
      label: "Bundle deb",
      group: "package",
      kind: "planned",
      description: "planned package",
      cliFlags: ["--bundle-deb"],
    },
  ];

  const bridge: c420uiProjectBridge = {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return actions;
    },
    artifactWorkflows() {
      return [];
    },
    async runAction(actionId, context) {
      runCalls.push({ actionId, context });
      return options?.result ?? {
        code: c420uiExitCodes.success,
        status: "success",
        message: "ok",
      };
    },
  };

  return { bridge, runCalls };
}

async function runCli(argv: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const { bridge, runCalls } = createFakeBridge();
  const result = await runC420UICli({
    bridge,
    rootDir: "/repo",
    argv,
    env: { TEST_ENV: "1" } as NodeJS.ProcessEnv,
    writeStdout(line) {
      stdout.push(line);
    },
    writeStderr(line) {
      stderr.push(line);
    },
  });
  return { result, stdout, stderr, runCalls };
}

test("c420ui CLI --help returns success", async () => {
  const { result, stdout, runCalls } = await runCli(["--help"]);

  assert.deepEqual(result, { exitCode: c420uiExitCodes.success, handled: true });
  assert.equal(stdout.some((line) => line.includes("c420ui CLI bridge")), true);
  assert.equal(runCalls.length, 0);
});

test("c420ui CLI resolves actions by cliFlags", async () => {
  const { result, stdout, runCalls } = await runCli(["--doctor"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.deepEqual(stdout, ["ok"]);
  assert.equal(runCalls[0]?.actionId, "doctor");
});

test("c420ui CLI resolves actions by legacy cli flags", async () => {
  const { result, runCalls } = await runCli(["--legacy"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.actionId, "legacy");
});

test("c420ui CLI rejects unknown options", async () => {
  const { result, stderr, runCalls } = await runCli(["--does-not-exist"]);

  assert.equal(result.exitCode, c420uiExitCodes.invalidUsage);
  assert.deepEqual(stderr, ["Unknown option: --does-not-exist"]);
  assert.equal(runCalls.length, 0);
});

test("c420ui CLI rejects multiple direct actions", async () => {
  const { result, stderr, runCalls } = await runCli(["--clean", "--purge"]);

  assert.equal(result.exitCode, c420uiExitCodes.invalidUsage);
  assert.deepEqual(stderr, ["Only one direct action can be executed per invocation."]);
  assert.equal(runCalls.length, 0);
});

test("c420ui CLI preserves planned action exit code", async () => {
  const { result, stdout, runCalls } = await runCli(["--bundle-deb"]);

  assert.equal(result.exitCode, c420uiExitCodes.plannedAction);
  assert.deepEqual(stdout, ["planned package"]);
  assert.equal(runCalls.length, 0);
});

test("c420ui CLI planned action dry-runs return success", async () => {
  const { result, stdout, runCalls } = await runCli(["--bundle-deb", "--dry-run"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.deepEqual(stdout, ["dry-run"]);
  assert.equal(runCalls.length, 0);
});

test("c420ui CLI propagates --yes", async () => {
  const { result, runCalls } = await runCli(["--doctor", "--yes"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.context.yes, true);
});

test("c420ui CLI propagates --force as yes", async () => {
  const { result, runCalls } = await runCli(["--doctor", "--force"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.context.yes, true);
});

test("generic c420ui CLI uses bridge actions instead of hardcoded Canva Linux flags", async () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const customAction: c420uiAction = {
    id: "custom",
    label: "Custom",
    group: "custom",
    kind: "command",
    cliFlags: ["--project-custom"],
  };
  const runCalls: string[] = [];
  const bridge: c420uiProjectBridge = {
    id: "custom-project",
    projectInfo() {
      return { projectName: "Custom Project" };
    },
    actions() {
      return [customAction];
    },
    artifactWorkflows() {
      return [];
    },
    async runAction(actionId) {
      runCalls.push(actionId);
      return { code: 0, status: "success", message: "custom ok" };
    },
  };

  const result = await runC420UICli({
    bridge,
    rootDir: "/custom",
    argv: ["--project-custom"],
    writeStdout: (line) => stdout.push(line),
    writeStderr: (line) => stderr.push(line),
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(runCalls, ["custom"]);
  assert.deepEqual(stdout, ["custom ok"]);
  assert.deepEqual(stderr, []);
});
