import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  detectAppImageFullVersion,
  detectAppImageVersion,
} from "../c420ui/operations/detection/appimage-detection";

function withTestEnv(run: (envDir: string) => void): void {
  const envDir = mkdtempSync(path.join(tmpdir(), "canva-linux-install-detection-test-"));
  mkdirSync(path.join(envDir, "dist"), { recursive: true });

  try {
    run(envDir);
  } finally {
    rmSync(envDir, { recursive: true, force: true });
  }
}

test("AppImage sidecar fullVersion is preferred over filename base version", () => {
  withTestEnv((envDir) => {
    const appImagePath = path.join(envDir, "dist", "canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "fake appimage content");
    
    const sidecarPath = `${appImagePath}.build-metadata.json`;
    writeFileSync(sidecarPath, JSON.stringify({
      fullVersion: "0.1.4-15.Dev.9+gabc1234",
      baseVersion: "0.1.4-15.Dev.9"
    }));
    
    const version = detectAppImageFullVersion(envDir);
    assert.equal(version, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("AppImage sidecar baseVersion is preferred for base version", () => {
  withTestEnv((envDir) => {
    const appImagePath = path.join(envDir, "dist", "canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "fake appimage content");
    
    const sidecarPath = `${appImagePath}.build-metadata.json`;
    writeFileSync(sidecarPath, JSON.stringify({
      fullVersion: "0.1.4-15.Dev.9+gabc1234",
      baseVersion: "0.1.4-15.Dev.9"
    }));
    
    const version = detectAppImageVersion(envDir);
    assert.equal(version, "0.1.4-15.Dev.9");
  });
});

test("Fallback to filename still works when no sidecar exists", () => {
  withTestEnv((envDir) => {
    const appImagePath = path.join(envDir, "dist", "canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "fake appimage content");
    
    const version = detectAppImageVersion(envDir);
    assert.equal(version, "0.1.4-14");
  });
});
