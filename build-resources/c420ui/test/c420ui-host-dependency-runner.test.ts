import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runC420UIHostDependencyEnsure } from "../src/host-dependency-runner";
import type { c420uiHostDependencyConfig } from "../src/host-dependencies";

function makeProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-runner-"));
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify({ scripts: {}, devDependencies: { typescript: "1.0.0" } }),
  );
  fs.writeFileSync(path.join(rootDir, "package-lock.json"), "{}");
  return rootDir;
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

test("clean repair forces npm install even when checks pass", () => {
  const rootDir = makeProject();
  const calls: string[][] = [];
  const result = runC420UIHostDependencyEnsure(config, {
    rootDir,
    env: { C420UI_DEPENDENCY_REPAIR: "clean" },
    runCommand: (_command, args) => {
      calls.push(args);
      return { status: 0 };
    },
  });

  assert.equal(result.status, "available");
  assert.deepEqual(calls[0], ["ci", "--include=dev"]);
});

test("dryRun returns plannedCommand", () => {
  const rootDir = makeProject();
  const result = runC420UIHostDependencyEnsure(missingDependencyConfig, {
    rootDir,
    env: {},
    dryRun: true,
  });

  assert.equal(result.status, "skipped");
  assert.deepEqual(result.plannedCommand, {
    command: "npm",
    args: ["ci", "--include=dev"],
    cwd: rootDir,
  });
});

test("C420UI_DEPENDENCY_REPAIR=clean with dryRun does not execute npm", () => {
  const rootDir = makeProject();
  let called = false;
  const result = runC420UIHostDependencyEnsure(config, {
    rootDir,
    env: { C420UI_DEPENDENCY_REPAIR: "clean" },
    dryRun: true,
    runCommand: () => {
      called = true;
      return { status: 0 };
    },
  });

  assert.equal(result.status, "skipped");
  assert.equal(called, false);
  assert.deepEqual(result.plannedCommand?.args, ["ci", "--include=dev"]);
});
