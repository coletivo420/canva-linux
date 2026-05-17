// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  appendBuildRevision,
  createBuildMetadata,
  normalizeBuildRevision,
} = loadRuntimeModule("main/build-metadata");

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

test("fallback metadata uses neutral values without source files", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { fallbackBaseMetadata } = loadRuntimeModule("main/build-metadata");
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
    assert.notEqual(metadata.baseVersion, "0.1.4-15.Dev.7");
    assert.notEqual(metadata.baseDisplayVersion, "0.1.4-15.Dev");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("partial loaded metadata is rejected before effective version creation", () => {
  const { normalizeLoadedBuildMetadata } = loadRuntimeModule("main/build-metadata");

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

test("loaded metadata is normalized with unknown revision fallback", () => {
  const { normalizeLoadedBuildMetadata } = loadRuntimeModule("main/build-metadata");

  const metadata = normalizeLoadedBuildMetadata({
    baseVersion: "0.1.4-15.Dev.7",
    baseDisplayVersion: "0.1.4-15.Dev",
    basePhase: "0.1.4-15.Dev.7",
  });

  assert.equal(metadata.buildRevision, "unknown");
  assert.equal(metadata.version, "0.1.4-15.Dev.7");
  assert.equal(metadata.displayVersion, "0.1.4-15.Dev");
  assert.equal(metadata.phase, "0.1.4-15.Dev.7");
});

test("build metadata source does not hardcode current Dev.7 fallbacks", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, ".."), "electron", "main", "build-metadata.ts"),
    "utf8",
  );

  assert.equal(source.includes('"0.1.4-15.Dev.7"'), false);
  assert.equal(source.includes('"0.1.4-15.Dev"'), false);
  assert.equal(source.includes('"0.0.0"'), true);
  assert.equal(source.includes('"unknown"'), true);
});
