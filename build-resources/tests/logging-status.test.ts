import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const { createCentralLogger, createStatusLogger } = await loadRuntimeModule("main/logging");

test("central logger writes Canva log file without terminal debug output", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "canva-logger-"));
  const logger = createCentralLogger({
    app: {
      getPath(name) {
        assert.equal(name, "userData");
        return tmp;
      },
    },
  });
  const logPath = logger.initLogFile();

  logger.logDebug("tabs:toolbar", ["toolbar-console", "missing-bridge"], {
    source: "main",
    terminal: false,
  });

  const content = fs.readFileSync(logPath, "utf8");
  assert.match(content, /\[canva:main:tabs:toolbar:ok\]/);
  assert.match(content, /toolbar-console missing-bridge/);
});

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
