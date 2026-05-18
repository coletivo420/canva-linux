import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateManifestArtifactHashes } from "../checks/check-bootstrap";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT ||
  process.env.CANVA_TEST_REPO_ROOT ||
  path.resolve(__dirname, "..", "..", "..");
const artifacts = [
  "run-c420ui.cjs",
  "run-c420ui-cli.cjs",
  "c420ui-builder.cjs",
] as const;

type BootstrapManifest = {
  generatedBy?: string;
  artifactHashes?: Record<string, string>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function makeTempDir(prefix: string): string {
  const parent = path.join(rootDir, ".build", "test-temp");
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, prefix));
}

function sha256(filePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")}`;
}

function copyBootstrapToTemp(tempDir: string): string {
  const tempRoot = path.join(tempDir, "root");
  const tempBootstrap = path.join(tempRoot, "bootstrap", "c420ui");
  fs.mkdirSync(tempBootstrap, { recursive: true });

  for (const artifact of artifacts) {
    fs.copyFileSync(
      path.join(rootDir, "bootstrap", "c420ui", artifact),
      path.join(tempBootstrap, artifact),
    );
  }
  fs.copyFileSync(
    path.join(rootDir, "bootstrap", "c420ui", "manifest.json"),
    path.join(tempBootstrap, "manifest.json"),
  );

  return tempRoot;
}

function compileBootstrapBuilder(tempDir: string): string {
  const outfile = path.join(tempDir, "build-c420ui-bootstrap.cjs");
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "scripts/build-c420ui-bootstrap.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=cjs",
      "--external:esbuild",
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
    `failed to compile bootstrap builder: ${result.stderr || result.stdout}`,
  );
  return outfile;
}

test("manifest artifact hashes match committed bootstrap artifacts", () => {
  const manifest = readJson<BootstrapManifest>(
    path.join(rootDir, "bootstrap", "c420ui", "manifest.json"),
  );

  assert.equal(manifest.generatedBy, "scripts/build-c420ui-bootstrap.ts");
  assert.ok(manifest.artifactHashes);

  for (const artifact of artifacts) {
    assert.equal(
      manifest.artifactHashes?.[artifact],
      sha256(path.join(rootDir, "bootstrap", "c420ui", artifact)),
    );
  }
});

test("manifest hash validation fails when an artifact is manually edited", () => {
  const tempDir = makeTempDir("c420ui-artifact-hash-");

  try {
    const tempRoot = copyBootstrapToTemp(tempDir);
    fs.appendFileSync(
      path.join(tempRoot, "bootstrap", "c420ui", "run-c420ui.cjs"),
      "\n// manual edit\n",
    );

    const manifest = readJson<Record<string, unknown>>(
      path.join(tempRoot, "bootstrap", "c420ui", "manifest.json"),
    );
    const failures: string[] = [];
    validateManifestArtifactHashes(tempRoot, manifest, failures);

    assert.equal(failures.length, 1);
    assert.match(failures[0], /run-c420ui\.cjs: artifact hash differs/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("build:c420ui-bootstrap cleans output directory before writing", () => {
  const tempDir = makeTempDir("c420ui-clean-build-");

  try {
    const outDir = path.join(tempDir, "bootstrap", "c420ui");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stale-file.txt"), "stale\n");

    const builder = compileBootstrapBuilder(tempDir);
    const result = spawnSync(process.execPath, [builder], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CANVA_SCRIPT_REPO_ROOT: rootDir,
        C420UI_BOOTSTRAP_OUT_DIR: outDir,
      },
      shell: false,
    });

    assert.equal(
      result.status,
      0,
      `bootstrap builder failed: ${result.stderr || result.stdout}`,
    );
    assert.equal(fs.existsSync(path.join(outDir, "stale-file.txt")), false);

    const manifest = readJson<BootstrapManifest>(path.join(outDir, "manifest.json"));
    assert.equal(manifest.generatedBy, "scripts/build-c420ui-bootstrap.ts");
    for (const artifact of artifacts) {
      assert.equal(manifest.artifactHashes?.[artifact], sha256(path.join(outDir, artifact)));
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
