import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { C420UI_BOOTSTRAP_ARTIFACTS } from "../scripts/checks/canva-linux/c420ui-bootstrap-check-helpers";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT ||
  process.env.CANVA_TEST_REPO_ROOT ||
  path.resolve(__dirname, "..", "..");
const artifactPaths = C420UI_BOOTSTRAP_ARTIFACTS;
const artifacts = artifactPaths.map((artifact) => path.basename(artifact));

function makeTempDir(prefix: string): string {
  const parent = path.join(rootDir, ".build", "test-temp");
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, prefix));
}

function compileNodeCheckGate(tempDir: string): string {
  const outfile = path.join(tempDir, "check-c420ui-node-check.cjs");
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "scripts/checks/canva-linux/check-c420ui-node-check.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=cjs",
      `--outfile=${outfile}`,
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
    },
  );

  assert.equal(
    result.status,
    0,
    `failed to compile syntax gate: ${result.stderr || result.stdout}`,
  );
  return outfile;
}

function createBootstrapRoot(tempDir: string): string {
  const testRoot = path.join(tempDir, "root");
  const bootstrapDir = path.join(testRoot, "bootstrap", "c420ui");
  fs.mkdirSync(bootstrapDir, { recursive: true });

  for (const artifact of artifacts) {
    fs.copyFileSync(
      path.join(rootDir, "bootstrap", "c420ui", artifact),
      path.join(bootstrapDir, artifact),
    );
  }

  return testRoot;
}

for (const artifact of artifacts) {
  test(`syntax gate fails when ${artifact} has a syntax error`, () => {
    const tempDir = makeTempDir("c420ui-syntax-gate-");

    try {
      const gateScript = compileNodeCheckGate(tempDir);
      const testRoot = createBootstrapRoot(tempDir);
      fs.appendFileSync(
        path.join(testRoot, "bootstrap", "c420ui", artifact),
        "\nif (\n",
      );

      const result = spawnSync(process.execPath, [gateScript], {
        cwd: testRoot,
        encoding: "utf8",
        shell: false,
      });

      assert.notEqual(result.status, 0);
      const output = `${result.stdout}\n${result.stderr}`;
      assert.match(output, new RegExp(artifact.replace(".", "\\.")));
      assert.match(output, /syntax validation failed/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
}

test("artifact list comes from shared helper", () => {
  assert.deepEqual(artifactPaths, [
    "bootstrap/c420ui/run-c420ui.cjs",
    "bootstrap/c420ui/run-c420ui-cli.cjs",
    "bootstrap/c420ui/c420ui-builder.cjs",
  ]);

  const nodeCheckSource = fs.readFileSync(
    path.join(rootDir, "scripts/checks/canva-linux/check-c420ui-node-check.ts"),
    "utf8",
  );
  assert.match(nodeCheckSource, /C420UI_BOOTSTRAP_ARTIFACTS/);
  assert.doesNotMatch(nodeCheckSource, /const bundles = \[/);
});
