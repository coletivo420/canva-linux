import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { detectInstallations } from "../operations/detection/install-detection.js";

test("detectInstallations includes source hashes when metadata is available", () => {
  const tmpDir = path.join(os.tmpdir(), `canva-linux-test-hashes-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const metadataPath = path.join(tmpDir, "build-resources/canva-linux/config/build-metadata.json");
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });

  const testHash = "sha256:3c46ce2ccd0fca47ccc09c0c622536dd0b83bd1f19fccfc041b002c7fb377ef0";
  fs.writeFileSync(
    metadataPath,
    JSON.stringify({
      baseVersion: "0.1.4-15.Dev.11",
      baseDisplayVersion: "0.1.4-15.Dev.11",
      basePhase: "0.1.4-15.Dev.11",
      canvaLinuxSourceHash: testHash,
    }),
  );

  // We can't easily mock global paths like /opt or /var/lib/flatpak without
  // refactoring the detection logic to accept a root path for everything.
  // But we can test AppImage which uses the rootDir parameter.

  const distDir = path.join(tmpDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  const appImagePath = path.join(distDir, "canva-linux-0.1.4-15.Dev.11-x86_64.AppImage");
  fs.writeFileSync(appImagePath, "fake appimage");
  fs.writeFileSync(`${appImagePath}.build-metadata.json`, JSON.stringify({
    canvaLinuxSourceHash: testHash,
    baseVersion: "0.1.4-15.Dev.11",
    baseDisplayVersion: "0.1.4-15.Dev.11",
    basePhase: "0.1.4-15.Dev.11",
  }));

  try {
    const result = detectInstallations(tmpDir);
    assert.equal(result.DETECTED_APPIMAGE_ARTIFACTS, true);
    assert.equal(result.DETECTED_APPIMAGE_HASH, testHash);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
