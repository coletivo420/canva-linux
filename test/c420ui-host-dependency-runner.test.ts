import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runC420UIHostDependencyEnsure } from "../packages/c420ui/src/host-dependency-runner";
import type { c420uiHostDependencyConfig } from "../packages/c420ui/src/host-dependencies";

function makeProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-runner-"));
  fs.writeFileSync(path.join(rootDir, "package.json"), JSON.stringify({ scripts: {} }));
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
