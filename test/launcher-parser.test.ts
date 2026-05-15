import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cliEntrypoint = path.join(".build", "scripts", "run-c420ui-cli.js");
const stubSource = [
  'const fs = require("node:fs");',
  'const capturePath = process.env.CANVA_LAUNCHER_STUB_ARGS;',
  'if (!capturePath) {',
  '  throw new Error("CANVA_LAUNCHER_STUB_ARGS is required");',
  '}',
  'fs.appendFileSync(capturePath, `${JSON.stringify(process.argv.slice(2))}\\n`);',
  'process.exit(Number(process.env.CANVA_LAUNCHER_STUB_EXIT || "0"));',
  '',
].join("\n");

test("launcher shell syntax is valid", () => {
  const result = spawnSync("bash", ["-n", "canva-linux.sh"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
});

function writeStub(): () => void {
  fs.mkdirSync(path.dirname(cliEntrypoint), { recursive: true });

  const backupPath = `${cliEntrypoint}.launcher-parser-test-backup`;
  const hadExistingEntrypoint = fs.existsSync(cliEntrypoint);

  if (hadExistingEntrypoint && !fs.existsSync(backupPath)) {
    fs.renameSync(cliEntrypoint, backupPath);
  }

  fs.writeFileSync(cliEntrypoint, stubSource, { mode: 0o755 });

  return () => {
    fs.rmSync(cliEntrypoint, { force: true });
    if (hadExistingEntrypoint) {
      fs.renameSync(backupPath, cliEntrypoint);
    } else {
      fs.rmSync(backupPath, { force: true });
    }
  };
}

function runLauncher(args: string[], capturePath: string) {
  const tempDir = path.dirname(capturePath);
  let launcherPath = process.env.PATH ?? "";

  if (typeof process.getuid === "function" && process.getuid() === 0) {
    const nodePath = path.join(tempDir, "node");
    if (!fs.existsSync(nodePath)) {
      fs.copyFileSync(process.execPath, nodePath);
      fs.chmodSync(nodePath, 0o755);
    }
    launcherPath = `${tempDir}:${launcherPath}`;
  }

  const envPairs = [
    `CANVA_LAUNCHER_STUB_ARGS=${capturePath}`,
    `HOME=${tempDir}`,
    `PATH=${launcherPath}`,
    "TERM=xterm",
    "NO_COLOR=1",
  ];

  if (typeof process.getuid === "function" && process.getuid() === 0) {
    return spawnSync(
      "runuser",
      ["-u", "nobody", "--", "env", ...envPairs, "./canva-linux.sh", ...args],
      { encoding: "utf8" },
    );
  }

  return spawnSync("./canva-linux.sh", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      CANVA_LAUNCHER_STUB_ARGS: capturePath,
      HOME: path.dirname(capturePath),
      TERM: "xterm",
      NO_COLOR: "1",
    },
  });
}

function readCapturedArgs(capturePath: string): string[][] {
  if (!fs.existsSync(capturePath)) {
    return [];
  }

  return fs
    .readFileSync(capturePath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

test("launcher forwards direct action flags to the c420ui CLI bridge stub", async (t) => {
  const restore = writeStub();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-launcher-parser-"));
  fs.chmodSync(tempDir, 0o777);

  t.after(() => {
    restore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const cases: Array<{ name: string; args: string[]; expected: string[] }> = [
    {
      name: "forwards --doctor --dry-run",
      args: ["--doctor", "--dry-run"],
      expected: ["--doctor", "--dry-run"],
    },
    {
      name: "forwards --purge --yes",
      args: ["--purge", "--yes"],
      expected: ["--purge", "--yes"],
    },
    {
      name: "translates --purge --force to --purge --yes",
      args: ["--purge", "--force"],
      expected: ["--purge", "--yes"],
    },
    {
      name: "forwards unknown flags to the bridge",
      args: ["--does-not-exist"],
      expected: ["--does-not-exist"],
    },
  ];

  for (const { name, args, expected } of cases) {
    await t.test(name, () => {
      const capturePath = path.join(tempDir, `${name.replaceAll(/\W+/g, "-")}.jsonl`);
      const result = runLauncher(args, capturePath);

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.deepEqual(readCapturedArgs(capturePath), [expected]);
    });
  }
});

test("launcher rejects multiple direct actions before calling the bridge stub", (t) => {
  const restore = writeStub();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-launcher-parser-"));
  fs.chmodSync(tempDir, 0o777);
  const capturePath = path.join(tempDir, "multiple-actions.jsonl");

  t.after(() => {
    restore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const result = runLauncher(["--clean", "--purge"], capturePath);

  assert.equal(result.status, 64, result.stderr || result.stdout);
  assert.deepEqual(readCapturedArgs(capturePath), []);
});

function readLauncherSource(): string {
  return fs.readFileSync("canva-linux.sh", "utf8");
}

function extractLauncherFunction(source: string, functionName: string): string {
  const start = source.indexOf(`${functionName}() {`);
  assert.notEqual(start, -1, `missing ${functionName}`);

  const nextFunction = source.indexOf("\nensure_action_runner_available()", start);
  assert.notEqual(nextFunction, -1, `could not locate end of ${functionName}`);

  return source.slice(start, nextFunction);
}

test("launcher contains minimal c420ui npm bootstrap policy", () => {
  const launcher = readLauncherSource();
  const bootstrap = extractLauncherFunction(launcher, "ensure_c420ui_bootstrap_npm_dependencies");

  assert.match(launcher, /c420ui_bootstrap_npm_dependencies_available\(\) \{/);
  assert.match(launcher, /ensure_c420ui_bootstrap_npm_dependencies\(\) \{/);
  assert.match(launcher, /node_modules\/\.bin\/esbuild/);
  assert.match(launcher, /node_modules\/blessed/);
  assert.match(bootstrap, /local bootstrap_packages=\(esbuild blessed\)/);
  assert.match(bootstrap, /npm install --no-save --package-lock=false --include=dev --ignore-scripts/);
  assert.match(bootstrap, /C420UI_SKIP_DEPENDENCY_INSTALL/);
  assert.match(bootstrap, /c420ui bootstrap dependencies are missing and C420UI_SKIP_DEPENDENCY_INSTALL=1 is set\./);
  assert.match(launcher, /ensure_c420ui_bootstrap_npm_dependencies\n\n  CANVA_SCRIPT_REPO_ROOT="\$\{ROOT_DIR\}" npm run build:scripts/);

  for (const forbiddenPackage of [
    "electron",
    "electron-builder",
    "eslint",
    "typescript",
    "@typescript-eslint/parser",
    "@typescript-eslint/eslint-plugin",
  ]) {
    assert.equal(
      bootstrap.includes(forbiddenPackage),
      false,
      `launcher bootstrap must not install ${forbiddenPackage}`,
    );
  }
});

test("launcher bootstrap does not restore legacy npm dependency policy", () => {
  const launcher = readLauncherSource();
  const bootstrap = extractLauncherFunction(launcher, "ensure_c420ui_bootstrap_npm_dependencies");

  assert.equal(launcher.includes("scripts/ensure-npm-dependencies.sh"), false);
  assert.equal(launcher.includes("CANVA_REQUIRED_NPM_DEPS"), false);
  assert.equal(launcher.includes("CANVA_SKIP_NPM_INSTALL"), false);
  assert.equal(launcher.includes("CANVA_NPM_REPAIR"), false);
  assert.equal(bootstrap.includes("npm ci"), false);
  assert.equal(bootstrap.includes("package-lock=true"), false);
  assert.equal(/(^|\s)--save(=|\s|$)/.test(bootstrap), false);
});
