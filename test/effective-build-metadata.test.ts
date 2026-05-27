// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");
const { loadCanvaLinuxBuildMetadata } = loadRuntimeModule("main/build-metadata");

function writeMetadata(filePath, revision) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({
      baseVersion: "1.0.0",
      baseDisplayVersion: "1.0.0",
      basePhase: "1.0.0",
      buildRevision: revision,
    })}\n`,
    "utf8",
  );
}

test("runtime prefers effective metadata over committed metadata", () => {
  const previousCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "canva-effective-metadata-"));
  try {
    writeMetadata(path.join(tmp, "config", "canva-linux", "build-metadata.json"), "unknown");
    writeMetadata(path.join(tmp, ".build", "canva-linux", "build-metadata.effective.json"), "abc1234");
    process.chdir(tmp);

    const metadata = loadCanvaLinuxBuildMetadata();
    assert.equal(metadata.buildRevision, "gabc1234");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runtime falls back to committed metadata when effective metadata is missing", () => {
  const previousCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "canva-committed-metadata-"));
  try {
    writeMetadata(path.join(tmp, "config", "canva-linux", "build-metadata.json"), "unknown");
    process.chdir(tmp);

    const metadata = loadCanvaLinuxBuildMetadata();
    assert.equal(metadata.buildRevision, "unknown");
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
