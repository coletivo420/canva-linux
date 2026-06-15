import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runC420UIHostDependencyEnsure } from "../src/host-dependency-runner.js";
import type { c420uiHostDependencyConfig } from "../src/host-dependencies.js";

function makeProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-runner-"));
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify({ scripts: {}, devDependencies: { typescript: "1.0.0" } }),
  );
  fs.writeFileSync(path.join(rootDir, "package-lock.json"), "{}");
  return rootDir;
}

function makeRustHostStub(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-host-stub-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(
    binPath,
    `#!/bin/sh
cat >/dev/null
printf '%s' '{"ok":true,"command":"check-host-dependencies","version":"0.1.0","status":"available","message":"Host dependencies are available.","dependencies":[]}'
`,
  );
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

const config: c420uiHostDependencyConfig = {
  node: { minimumMajor: 1, required: true },
  commands: [],
  npm: {
    packageManager: "npm",
    lockfile: "package-lock.json",
    installStrategy: "auto",
    includeDev: true,
    requiredDevDependencies: [],
  },
};

const missingDependencyConfig: c420uiHostDependencyConfig = {
  ...config,
  npm: {
    packageManager: "npm",
    lockfile: "package-lock.json",
    installStrategy: "auto",
    includeDev: true,
    requiredDevDependencies: ["typescript"],
  },
};

test("clean repair forces npm install even when checks pass", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub();
  const calls: string[][] = [];
  const result = await runC420UIHostDependencyEnsure(config, {
    rootDir,
    env: { C420UI_DEPENDENCY_REPAIR: "clean", C420UI_HOST_BIN: rustHostBin },
    runCommand: async (options) => {
      calls.push(options.args);
      return { status: "available" };
    },
  });

  assert.equal(result.status, "available");
  assert.deepEqual(calls[0], ["ci", "--include=dev"]);
});

test("dryRun returns plannedCommand", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub();
  const result = await runC420UIHostDependencyEnsure(missingDependencyConfig, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin },
    dryRun: true,
  });

  assert.equal(result.status, "skipped");
  assert.deepEqual(result.plannedCommand, {
    command: "npm",
    args: ["ci", "--include=dev"],
    cwd: rootDir,
  });
});

test("C420UI_DEPENDENCY_REPAIR=clean with dryRun does not execute npm", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub();
  let called = false;
  const result = await runC420UIHostDependencyEnsure(config, {
    rootDir,
    env: { C420UI_DEPENDENCY_REPAIR: "clean", C420UI_HOST_BIN: rustHostBin },
    dryRun: true,
    runCommand: async () => {
      called = true;
      return { status: "available" };
    },
  });

  assert.equal(result.status, "skipped");
  assert.equal(called, false);
  assert.deepEqual(result.plannedCommand?.args, ["ci", "--include=dev"]);
});
