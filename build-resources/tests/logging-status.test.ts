// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { createStatusLogger } = loadRuntimeModule("main/logging");

test("release status logs runtime metadata without inline changelog entries", () => {
  const calls = [];
  const statusLogger = createStatusLogger({
    app: {
      getPath(name) {
        assert.equal(name, "downloads");
        return "/tmp/downloads";
      },
    },
    appVersion: "1.2.3",
    buildMetadata: {
      version: "1.2.3+gabc1234",
      displayVersion: "1.2.3+gabc1234",
      phase: "1.2.3+gabc1234",
      buildRevision: "gabc1234",
    },
    debugLog(...args) {
      calls.push(args);
      return true;
    },
    logStatus() {},
  });

  assert.deepEqual(Object.keys(statusLogger).sort(), [
    "logCredentialStoragePolicy",
    "logReleaseStatus",
  ]);

  statusLogger.logReleaseStatus();

  assert.deepEqual(calls, [
    [
      "startup",
      "release",
      "version=1.2.3+gabc1234",
      "displayVersion=1.2.3+gabc1234",
      "phase=1.2.3+gabc1234",
      "buildRevision=gabc1234",
      `platform=${process.platform}`,
      `arch=${process.arch}`,
      "downloads=/tmp/downloads",
    ],
  ]);
});
