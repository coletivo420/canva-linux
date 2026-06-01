import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT ||
  process.env.CANVA_TEST_REPO_ROOT ||
  path.resolve(__dirname, "..", "..", "..");
const artifacts = [
  "run-c420ui.mjs",
  "run-c420ui-cli.mjs",
  "c420ui-builder.mjs",
] as const;

function makeTempDir(prefix: string): string {
  const parent = path.join(rootDir, ".build", "test-temp");
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, prefix));
}

function compileNodeCheckGate(tempDir: string): string {
  const outfile = path.join(tempDir, "check-node.cjs");
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "build-resources/c420ui/checks/check-node.ts",
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
  const bootstrapDir = path.join(
    testRoot,
    "build-resources",
    "c420ui",
    "bootstrap",
    "generated",
  );
  fs.mkdirSync(bootstrapDir, { recursive: true });

  for (const artifact of artifacts) {
    fs.copyFileSync(
      path.join(
        rootDir,
        "build-resources",
        "c420ui",
        "bootstrap",
        "generated",
        artifact,
      ),
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
        path.join(
          testRoot,
          "build-resources",
          "c420ui",
          "bootstrap",
          "generated",
          artifact,
        ),
        "\nif (\n",
      );

      const result = spawnSync(process.execPath, [path.relative(testRoot, gateScript)], {
        cwd: testRoot,
        encoding: "utf8",
        shell: false,
      });

      assert.notEqual(result.status, 0);
      const output = `${result.stdout}\n${result.stderr}`;
      if (output.trim()) {
        assert.match(output, new RegExp(artifact.replace(".", "\\.")));
        assert.match(output, /syntax validation failed/);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
}
