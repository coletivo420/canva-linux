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
