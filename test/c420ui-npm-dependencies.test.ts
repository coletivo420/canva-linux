import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkC420UINpmDependencies,
  ensureC420UINpmDependencies,
  type c420uiNpmCommandRunner,
} from "../packages/c420ui/src/npm-dependencies";
import type { c420uiNpmDependencyConfig } from "../packages/c420ui/src/host-dependencies";

function makeProject(withLockfile = true): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-npm-"));
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify({ scripts: { build: "node build.js" } }),
  );
  if (withLockfile) fs.writeFileSync(path.join(rootDir, "package-lock.json"), "{}");
  return rootDir;
}

const config: c420uiNpmDependencyConfig = {
  packageManager: "npm",
  lockfile: "package-lock.json",
  installStrategy: "auto",
  includeDev: true,
  requiredDevDependencies: ["typescript"],
};

test("npm deps present pass", () => {
  const rootDir = makeProject();
  assert.equal(
    checkC420UINpmDependencies(config, {
      rootDir,
      resolveDependency: () => true,
    }).status,
    "available",
  );
});

test("npm deps missing are reported", () => {
  const rootDir = makeProject();
  const result = checkC420UINpmDependencies(config, {
    rootDir,
    resolveDependency: () => false,
  });
  assert.equal(result.status, "missing");
  assert.equal(result.dependencies?.[0]?.id, "typescript");
});

test("missing npm deps choose npm ci when lockfile exists", () => {
  const rootDir = makeProject(true);
  const calls: string[][] = [];
  const runCommand: c420uiNpmCommandRunner = (_command, args) => {
    calls.push(args);
    return { status: 0 };
  };
  const result = ensureC420UINpmDependencies(config, { rootDir, env: {}, runCommand });
  assert.equal(result.status, "available");
  assert.deepEqual(calls[0], ["ci", "--include=dev"]);
});

test("missing npm deps choose npm install without lockfile", () => {
  const rootDir = makeProject(false);
  const calls: string[][] = [];
  const runCommand: c420uiNpmCommandRunner = (_command, args) => {
    calls.push(args);
    return { status: 0 };
  };
  ensureC420UINpmDependencies(config, { rootDir, env: {}, runCommand });
  assert.deepEqual(calls[0], ["install", "--include=dev"]);
});

test("C420UI_SKIP_DEPENDENCY_INSTALL=1 does not install", () => {
  const rootDir = makeProject();
  let called = false;
  const result = ensureC420UINpmDependencies(config, {
    rootDir,
    env: { C420UI_SKIP_DEPENDENCY_INSTALL: "1" },
    runCommand: () => {
      called = true;
      return { status: 0 };
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(called, false);
});
