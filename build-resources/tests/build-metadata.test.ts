import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const {
  appendBuildRevision,
  createBuildMetadata,
  normalizeBuildRevision,
} = await loadRuntimeModule("main/build-metadata");
const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();

test("normalizes build revisions", () => {
  assert.equal(normalizeBuildRevision("abc1234"), "gabc1234");
  assert.equal(normalizeBuildRevision("gabc1234"), "gabc1234");
  assert.equal(normalizeBuildRevision("abcdef1234567890"), "gabcdef1");
  assert.equal(normalizeBuildRevision("unknown"), "unknown");
  assert.equal(normalizeBuildRevision(""), "unknown");
  assert.equal(normalizeBuildRevision(null), "unknown");
});

test("build metadata appends deterministic revisions only to effective versions", () => {
  const metadata = createBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
    buildRevision: "abc1234def",
  });

  assert.equal(metadata.buildRevision, "gabc1234");
  assert.equal(metadata.version, "0.1.4-15.Dev.7+gabc1234");
  assert.equal(metadata.displayVersion, "0.1.4-15.Dev+gabc1234");
  assert.equal(metadata.phase, "0.1.4-15.Dev.7+gabc1234");
  assert.equal(metadata.fullVersion, "0.1.4-15.Dev.7+gabc1234");
  assert.equal(metadata.baseVersion, "0.1.4-15.Dev.7");
  assert.equal(metadata.baseDisplayVersion, "0.1.4-15.Dev");
  assert.equal(metadata.basePhase, "0.1.4-15.Dev.7");
  assert.equal(metadata.canvaLinuxSourceHash, "unknown");
  assert.equal(metadata.c420uiSourceHash, "unknown");
  assert.equal(metadata.combinedSourceHash.startsWith("sha256:"), true);
});

test("unknown build revision keeps base effective versions", () => {
  assert.equal(appendBuildRevision("0.1.4-15.Dev.7", "unknown"), "0.1.4-15.Dev.7");
  const metadata = createBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
    buildRevision: "unknown",
  });
  assert.equal(metadata.version, "0.1.4-15.Dev.7");
  assert.equal(metadata.displayVersion, "0.1.4-15.Dev");
  assert.equal(metadata.phase, "0.1.4-15.Dev.7");
  assert.equal(metadata.fullVersion, "0.1.4-15.Dev.7");
});

test("committed/effective metadata preserve source hashes while build revision fields vary", () => {
  const sourceHashes = {
    canvaLinuxSourceHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    c420uiSourceHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    combinedSourceHash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  };

  const committed = createBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
    buildRevision: "unknown",
    ...sourceHashes,
  });
  const effective = createBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
    buildRevision: "abc1234def",
    ...sourceHashes,
  });

  assert.equal(committed.canvaLinuxSourceHash, sourceHashes.canvaLinuxSourceHash);
  assert.equal(committed.c420uiSourceHash, sourceHashes.c420uiSourceHash);
  assert.equal(committed.combinedSourceHash, sourceHashes.combinedSourceHash);

  assert.equal(effective.canvaLinuxSourceHash, committed.canvaLinuxSourceHash);
  assert.equal(effective.c420uiSourceHash, committed.c420uiSourceHash);
  assert.equal(effective.combinedSourceHash, committed.combinedSourceHash);

  assert.notEqual(effective.buildRevision, committed.buildRevision);
  assert.notEqual(effective.version, committed.version);
  assert.notEqual(effective.displayVersion, committed.displayVersion);
  assert.notEqual(effective.phase, committed.phase);
  assert.notEqual(effective.fullVersion, committed.fullVersion);
});

test("fallback metadata uses neutral values without source files", async () => {
  const { fallbackBaseMetadata } = await loadRuntimeModule("main/build-metadata");
  const previousCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "canva-metadata-fallback-"));

  try {
    process.chdir(tmp);
    const metadata = fallbackBaseMetadata();

    assert.equal(metadata.baseVersion, "0.0.0");
    assert.equal(metadata.baseDisplayVersion, "0.0.0");
    assert.equal(metadata.basePhase, "0.0.0");
    assert.equal(metadata.buildRevision, "unknown");
    assert.equal(metadata.version, "0.0.0");
    assert.equal(metadata.displayVersion, "0.0.0");
    assert.equal(metadata.phase, "0.0.0");
    assert.equal(metadata.fullVersion, "0.0.0");
    assert.equal(metadata.canvaLinuxSourceHash, "unknown");
    assert.equal(metadata.c420uiSourceHash, "unknown");
    assert.equal(metadata.combinedSourceHash, "unknown");
    assert.notEqual(metadata.baseVersion, "0.1.4-15.Dev.7");
    assert.notEqual(metadata.baseDisplayVersion, "0.1.4-15.Dev");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("partial loaded metadata is rejected before effective version creation", async () => {
  const { normalizeLoadedBuildMetadata } = await loadRuntimeModule("main/build-metadata");

  assert.equal(
    normalizeLoadedBuildMetadata({
      baseVersion: "0.1.4-15.Dev.7",
      buildRevision: "abc1234",
    }),
    null,
  );
  assert.equal(
    normalizeLoadedBuildMetadata({
      baseDisplayVersion: "0.1.4-15.Dev",
      basePhase: "0.1.4-15.Dev.7",
      buildRevision: "abc1234",
    }),
    null,
  );
});

test("loaded metadata is normalized with unknown revision fallback", async () => {
  const { normalizeLoadedBuildMetadata } = await loadRuntimeModule("main/build-metadata");

  const metadata = normalizeLoadedBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
  });

  assert.equal(metadata.buildRevision, "unknown");
  assert.equal(metadata.version, "0.1.4-15.Dev.7");
  assert.equal(metadata.displayVersion, "0.1.4-15.Dev");
  assert.equal(metadata.phase, "0.1.4-15.Dev.7");
  assert.equal(metadata.canvaLinuxSourceHash, "unknown");
  assert.equal(metadata.c420uiSourceHash, "unknown");
  assert.equal(metadata.combinedSourceHash, "unknown");
});

test("build metadata source does not hardcode current Dev.7 fallbacks", () => {
  const source = fs.readFileSync(
    path.join(
      process.env.CANVA_TEST_REPO_ROOT || process.cwd(),
      "build-resources",
      "electron",
      "main",
      "build-metadata.ts",
    ),
    "utf8",
  );

  assert.equal(source.includes('"0.1.4-15.Dev.7"'), false);
  assert.equal(source.includes('"0.1.4-15.Dev"'), false);
  assert.equal(source.includes('"0.0.0"'), true);
  assert.equal(source.includes('"unknown"'), true);
});

test("generate-build-metadata supports explicit committed/effective modes", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources", "c420ui", "scripts", "generate-build-metadata.ts"),
    "utf8",
  );

  assert.match(source, /--committed\|--effective/);
  assert.match(source, /buildRevision: mode === "effective" \? resolveBuildRevision\(rootDir\) : "unknown"/);
  assert.match(source, /\.build", "canva-linux", "build-metadata\.effective\.json"/);
});

test("committed mode does not resolve live git revision", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources", "c420ui", "scripts", "generate-build-metadata.ts"),
    "utf8",
  );

  assert.match(source, /mode === "effective" \? resolveBuildRevision\(rootDir\) : "unknown"/);
  assert.doesNotMatch(source, /mode === "committed"[\s\S]*resolveBuildRevision/);
});
