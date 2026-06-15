import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkC420UINpmDependencies,
  ensureC420UINpmDependencies,
  type c420uiNpmCommandRunner,
} from "../src/npm-dependencies.js";
import type { c420uiNpmDependencyConfig } from "../src/host-dependencies.js";

type ProjectOptions = {
  withLockfile?: boolean;
  packageJson?: Record<string, unknown> | string;
};

function makeProject(options: ProjectOptions = {}): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-npm-"));
  const packageJson = options.packageJson ?? {
    scripts: { build: "node build.js" },
    dependencies: { leftpad: "1.0.0" },
    devDependencies: { typescript: "1.0.0" },
  };
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    typeof packageJson === "string" ? packageJson : JSON.stringify(packageJson),
  );
  if (options.withLockfile !== false) fs.writeFileSync(path.join(rootDir, "package-lock.json"), "{}");
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

test("missing npm deps choose npm ci when lockfile exists", async () => {
  const rootDir = makeProject({ withLockfile: true });
  const calls: string[][] = [];
  const runCommand: c420uiNpmCommandRunner = async (options) => {
    calls.push(options.args);
    return { status: "available" };
  };
  const result = await ensureC420UINpmDependencies(config, { rootDir, env: {}, runCommand });
  assert.equal(result.status, "available");
  assert.deepEqual(calls[0], ["ci", "--include=dev"]);
});

test("missing npm deps choose npm install without lockfile", async () => {
  const rootDir = makeProject({ withLockfile: false });
  const calls: string[][] = [];
  const runCommand: c420uiNpmCommandRunner = async (options) => {
    calls.push(options.args);
    return { status: "available" };
  };
  await ensureC420UINpmDependencies(config, { rootDir, env: {}, runCommand });
  assert.deepEqual(calls[0], ["install", "--include=dev"]);
});

test("C420UI_SKIP_DEPENDENCY_INSTALL=1 does not install", async () => {
  const rootDir = makeProject();
  let called = false;
  const result = await ensureC420UINpmDependencies(config, {
    rootDir,
    env: { C420UI_SKIP_DEPENDENCY_INSTALL: "1" },
    runCommand: async () => {
      called = true;
      return { status: "available" };
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(called, false);
});

test("invalid package.json fails", () => {
  const rootDir = makeProject({ packageJson: "{" });
  const result = checkC420UINpmDependencies(config, { rootDir });
  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /not valid JSON/);
});

test("multiline npm script fails", () => {
  const rootDir = makeProject({
    packageJson: {
      scripts: { build: "echo one\necho two" },
      devDependencies: { typescript: "1.0.0" },
    },
  });
  const result = checkC420UINpmDependencies(config, {
    rootDir,
    resolveDependency: () => true,
  });
  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /must stay on one line/);
});

test('installStrategy="ci" uses ci without lockfile', async () => {
  const rootDir = makeProject({ withLockfile: false });
  const calls: string[][] = [];
  await ensureC420UINpmDependencies(
    { ...config, installStrategy: "ci" },
    {
      rootDir,
      env: {},
      runCommand: async (options) => {
        calls.push(options.args);
        return { status: "available" };
      },
    },
  );
  assert.deepEqual(calls[0], ["ci", "--include=dev"]);
});

test('installStrategy="install" uses install with lockfile', async () => {
  const rootDir = makeProject({ withLockfile: true });
  const calls: string[][] = [];
  await ensureC420UINpmDependencies(
    { ...config, installStrategy: "install" },
    {
      rootDir,
      env: {},
      runCommand: async (options) => {
        calls.push(options.args);
        return { status: "available" };
      },
    },
  );
  assert.deepEqual(calls[0], ["install", "--include=dev"]);
});

test("includeDev=false ignores requiredDevDependencies", () => {
  const rootDir = makeProject({
    packageJson: { scripts: {}, dependencies: { leftpad: "1.0.0" } },
  });
  const result = checkC420UINpmDependencies(
    { ...config, includeDev: false, requiredDependencies: ["leftpad"] },
    { rootDir, resolveDependency: () => true },
  );
  assert.equal(result.status, "available");
});

test("requiredDependencies and requiredDevDependencies together are checked", () => {
  const rootDir = makeProject();
  const checked: string[] = [];
  const result = checkC420UINpmDependencies(
    { ...config, requiredDependencies: ["leftpad"], requiredDevDependencies: ["typescript"] },
    {
      rootDir,
      resolveDependency: (dependency) => {
        checked.push(dependency);
        return true;
      },
    },
  );
  assert.equal(result.status, "available");
  assert.deepEqual(checked.sort(), ["leftpad", "typescript"]);
});

test("declared but missing dependency returns missing", () => {
  const rootDir = makeProject();
  const result = checkC420UINpmDependencies(config, {
    rootDir,
    resolveDependency: () => false,
  });
  assert.equal(result.status, "missing");
  assert.match(result.message ?? "", /declared but not installed/);
});

test("installed but undeclared dependency fails", () => {
  const rootDir = makeProject({ packageJson: { scripts: {} } });
  const result = checkC420UINpmDependencies(config, {
    rootDir,
    resolveDependency: () => true,
  });
  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /not declared/);
});

test("npm ensure uses Rust process runner contract", async () => {
  const rootDir = makeProject({ withLockfile: true });
  let observed: Parameters<c420uiNpmCommandRunner>[0] | undefined;
  const result = await ensureC420UINpmDependencies(config, {
    rootDir,
    env: { PATH: "/usr/bin", SECRET_TOKEN: "must-not-pass" },
    runCommand: async (options) => {
      observed = options;
      return { status: "available" };
    },
  });

  assert.equal(result.status, "available");
  assert.equal(observed?.command, "npm");
  assert.deepEqual(observed?.args, ["ci", "--include=dev"]);
  assert.equal(observed?.cwd, rootDir);
  assert.equal(observed?.label, "npm ci --include=dev");
});

test("npm failure maps to failed result", async () => {
  const rootDir = makeProject({ withLockfile: true });
  const result = await ensureC420UINpmDependencies(config, {
    rootDir,
    env: {},
    runCommand: async () => ({ status: "failed", exitCode: 9 }),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.exitCode, 9);
  assert.match(result.message ?? "", /npm ci --include=dev failed/);
});
