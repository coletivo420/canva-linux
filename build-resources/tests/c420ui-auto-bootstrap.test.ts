import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
  c420uiBootstrapArtifactPath,
} from "../c420ui/checks/bootstrap-check-helpers.js";
import {
  ensureC420UIBootstrapWithDeps,
  getC420UIBootstrapStatusWithDeps,
  type C420UIBootstrapDeps,
} from "../c420ui/bootstrap/ensure-bootstrap.js";

function runWithTempRoot(fn: (rootDir: string) => void): void {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-auto-bootstrap-"));
  try {
    fn(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeArtifact(rootDir: string, artifact: string, content = "module.exports = 1;\n"): void {
  const rel = c420uiBootstrapArtifactPath(artifact);
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

function writeManifest(rootDir: string, hash: string): void {
  const artifactHashes: Record<string, string> = {};
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const absolutePath = path.join(rootDir, c420uiBootstrapArtifactPath(artifact));
    artifactHashes[artifact] = `sha256:${createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex")}`;
  }

  const abs = path.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(
    abs,
    `${JSON.stringify({ c420uiSourceHash: hash, artifactHashes })}\n`,
    "utf8",
  );
}

function createValidBootstrapTree(rootDir: string, hash = "expected-hash"): void {
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    writeArtifact(rootDir, artifact);
  }
  writeManifest(rootDir, hash);
}

function createDeps(rootDir: string): { deps: C420UIBootstrapDeps; buildCalls: () => number } {
  let buildCallCount = 0;

  const deps: C420UIBootstrapDeps = {
    calculateSourceHash: () => "expected-hash",
    spawn: (command: string, args: readonly string[]) => {
      const argv = [...args];

      if (command === process.execPath && argv[0] === "--check") {
        return { status: 0, stdout: "", stderr: "" } as ReturnType<typeof import("node:child_process").spawnSync>;
      }

      if (command === "npm" && argv[0] === "run" && argv[1] === "build:c420ui-bootstrap") {
        buildCallCount += 1;
        createValidBootstrapTree(rootDir, "expected-hash");
        return { status: 0, stdout: "", stderr: "" } as ReturnType<typeof import("node:child_process").spawnSync>;
      }

      return { status: 0, stdout: "", stderr: "" } as ReturnType<typeof import("node:child_process").spawnSync>;
    },
  };

  return { deps, buildCalls: () => buildCallCount };
}

test("builder uses build-resources/c420ui/package.json for c420ui version", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/c420ui-builder.ts", "utf8");
  assert.match(source, /build-resources",\s*"c420ui",\s*"package\.json"/);
});

test("builder does not reference packages/c420ui/package.json", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/c420ui-builder.ts", "utf8");
  assert.doesNotMatch(source, /packages",\s*"c420ui",\s*"package\.json"/);
});

test("builder does not instruct users to run build:c420ui-bootstrap manually", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/c420ui-builder.ts", "utf8");
  assert.doesNotMatch(source, /Run npm run build:c420ui-bootstrap/);
  assert.doesNotMatch(source, /c420ui bootstrap bundle is missing/);
});

test("ensure-bootstrap regenerates when manifest is missing", () => runWithTempRoot((rootDir) => {
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    writeArtifact(rootDir, artifact);
  }

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 1);
}));

test("ensure-bootstrap regenerates when artifact is missing", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir);
  fs.rmSync(path.join(rootDir, c420uiBootstrapArtifactPath("run-c420ui.mjs")), { force: true });

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 1);
}));

test("ensure-bootstrap regenerates when artifact is empty", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir);
  fs.writeFileSync(path.join(rootDir, c420uiBootstrapArtifactPath("run-c420ui-cli.mjs")), "", "utf8");

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 1);
}));

test("ensure-bootstrap regenerates when c420uiSourceHash is stale", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir, "stale-hash");

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 1);
}));

test("ensure-bootstrap validates generated .mjs files with node --check", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir);

  const deps: C420UIBootstrapDeps = {
    calculateSourceHash: () => "expected-hash",
    spawn: (command: string, args: readonly string[]) => {
      const argv = [...args];
      if (command === process.execPath && argv[0] === "--check" && String(argv[1]).includes("run-c420ui-cli.mjs")) {
        return { status: 1, stdout: "", stderr: "syntax error" } as ReturnType<typeof import("node:child_process").spawnSync>;
      }
      return { status: 0, stdout: "", stderr: "" } as ReturnType<typeof import("node:child_process").spawnSync>;
    },
  };

  const status = getC420UIBootstrapStatusWithDeps(rootDir, deps);
  assert.equal(status.state, "invalid");
  if (status.state === "invalid") {
    assert.match(status.reason, /node --check/);
  }
}));

test("ensure-bootstrap regenerates when artifact hash differs from manifest", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir);
  fs.appendFileSync(path.join(rootDir, c420uiBootstrapArtifactPath("run-c420ui.mjs")), "\n// drift\n");

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 1);
}));

test("ensure-bootstrap does not regenerate when manifest/artifacts are valid", () => runWithTempRoot((rootDir) => {
  createValidBootstrapTree(rootDir);

  const { deps, buildCalls } = createDeps(rootDir);
  ensureC420UIBootstrapWithDeps(rootDir, deps);
  assert.equal(buildCalls(), 0);
}));

test("build-bootstrap.ts does not import ensure-bootstrap.ts", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/build-bootstrap.ts", "utf8");
  assert.doesNotMatch(source, /ensure-bootstrap/);
});
