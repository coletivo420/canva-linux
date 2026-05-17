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
