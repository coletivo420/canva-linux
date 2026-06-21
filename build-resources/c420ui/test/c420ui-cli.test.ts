import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  c420uiExitCodes,
  runC420UICli,
  type c420uiAction,
  type c420uiProjectBridge,
} from "../src/index.js";

function makeRustHostStub(capturePath: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-cli-host-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(
    binPath,
    `#!/bin/sh
read input
printf '%s\\n' "$input" >> ${JSON.stringify(capturePath)}
if printf '%s' "$input" | grep -q '"actionId":"bundle-deb"' && printf '%s' "$input" | grep -q '"dryRun":true'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"bundle-deb","status":"success","code":0}'
elif printf '%s' "$input" | grep -q '"actionId":"bundle-deb"'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"bundle-deb","status":"planned","code":${c420uiExitCodes.plannedAction}}'
elif printf '%s' "$input" | grep -q '"actionId":"purge"' && ! printf '%s' "$input" | grep -q '"yes":true'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"purge","status":"failed","code":${c420uiExitCodes.generalError}}'
elif printf '%s' "$input" | grep -q '"actionId":"custom"'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"custom","status":"success","code":0}'
elif printf '%s' "$input" | grep -q '"actionId":"legacy"'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"legacy","status":"success","code":0}'
elif printf '%s' "$input" | grep -q '"actionId":"purge"'; then
  printf '%s\\n' '{"event":"action:finish","actionId":"purge","status":"success","code":0}'
else
  printf '%s\\n' '{"event":"action:finish","actionId":"doctor","status":"success","code":0}'
fi
`,
  );
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function readRunCalls(capturePath: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(capturePath)) return [];
  return fs
    .readFileSync(capturePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function createFakeBridge() {
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
      dangerous: true,
      requiresConfirmation: true,
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
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by c420ui CLI");
    },
  };

  return { bridge };
}

async function runCli(argv: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const capturePath = path.join(os.tmpdir(), `c420ui-cli-${process.pid}-${Math.random()}.jsonl`);
  const rustHostBin = makeRustHostStub(capturePath);
  const { bridge } = createFakeBridge();
  const result = await runC420UICli({
    bridge,
    rootDir: "/repo",
    argv,
    env: {
      C420UI_HOST_BIN: rustHostBin,
      PATH: process.env.PATH,
      TEST_ENV: "1",
    } as NodeJS.ProcessEnv,
    writeStdout(line) {
      stdout.push(line);
    },
    writeStderr(line) {
      stderr.push(line);
    },
  });
  return { result, stdout, stderr, runCalls: readRunCalls(capturePath) };
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
  assert.deepEqual(stdout, []);
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


test("c420ui CLI blocks dangerous actions without --yes", async () => {
  const { result, stderr, runCalls } = await runCli(["--purge"]);

  assert.equal(result.exitCode, c420uiExitCodes.generalError);
  assert.deepEqual(stderr, []);
  assert.equal(runCalls[0]?.actionId, "purge");
  assert.equal(runCalls[0]?.yes, false);
});

test("c420ui CLI allows dangerous actions with --yes", async () => {
  const { result, runCalls } = await runCli(["--purge", "--yes"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.actionId, "purge");
  assert.equal(runCalls[0]?.yes, true);
});

test("c420ui CLI preserves planned action exit code", async () => {
  const { result, stdout, runCalls } = await runCli(["--bundle-deb"]);

  assert.equal(result.exitCode, c420uiExitCodes.plannedAction);
  assert.deepEqual(stdout, []);
  assert.equal(runCalls[0]?.actionId, "bundle-deb");
});

test("c420ui CLI planned action dry-runs return success", async () => {
  const { result, stdout, runCalls } = await runCli(["--bundle-deb", "--dry-run"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.deepEqual(stdout, []);
  assert.equal(runCalls[0]?.actionId, "bundle-deb");
  assert.equal(runCalls[0]?.dryRun, true);
});

test("c420ui CLI propagates --yes", async () => {
  const { result, runCalls } = await runCli(["--doctor", "--yes"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.yes, true);
});

test("c420ui CLI propagates --force as yes", async () => {
  const { result, runCalls } = await runCli(["--doctor", "--force"]);

  assert.equal(result.exitCode, c420uiExitCodes.success);
  assert.equal(runCalls[0]?.yes, true);
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
  const capturePath = path.join(os.tmpdir(), `c420ui-cli-custom-${process.pid}.jsonl`);
  const rustHostBin = makeRustHostStub(capturePath);
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
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by c420ui CLI");
    },
  };

  const result = await runC420UICli({
    bridge,
    rootDir: "/custom",
    argv: ["--project-custom"],
    env: { C420UI_HOST_BIN: rustHostBin, PATH: process.env.PATH },
    writeStdout: (line) => stdout.push(line),
    writeStderr: (line) => stderr.push(line),
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(readRunCalls(capturePath).map((call) => call.actionId), ["custom"]);
  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, []);
});
