import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");

function withTestEnv(run: (envDir: string) => void): void {
  const envDir = mkdtempSync(path.join(tmpdir(), "canva-linux-install-detection-test-"));
  mkdirSync(path.join(envDir, "dist"), { recursive: true });
  mkdirSync(path.join(envDir, "scripts"), { recursive: true });

  try {
    run(envDir);
  } finally {
    rmSync(envDir, { recursive: true, force: true });
  }
}

function runDetectionInShell(envDir: string, shellScript: string): string {
  const fullScript = `
    REPO_ROOT="${REPO_ROOT}"
    cd "${envDir}"
    # Mock some functions that might be missing or not needed
    ui_info() { :; }
    ui_warn() { :; }
    ui_ok() { :; }
    ui_die() { echo "$1" >&2; exit 1; }

    source "${REPO_ROOT}/scripts/install-detection-common.sh"
    ${shellScript}
  `;

  const result = spawnSync("bash", ["-c", fullScript], {
    encoding: "utf8",
    env: {
      ...process.env,
      APP_ID: "io.github.coletivo420.canva-linux",
    },
  });

  if (result.status !== 0) {
    throw new Error(`Shell script failed: ${result.stderr}`);
  }

  return result.stdout.trim();
}

test("AppImage sidecar fullVersion is preferred over filename base version", () => {
  withTestEnv((envDir) => {
    const appImagePath = path.join(envDir, "dist", "canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "fake appimage content");

    const sidecarPath = `${appImagePath}.build-metadata.json`;
    writeFileSync(sidecarPath, JSON.stringify({
      fullVersion: "0.1.4-15.Dev.9+gabc1234",
      baseVersion: "0.1.4-15.Dev.9",
    }));

    const version = runDetectionInShell(envDir, "detect_appimage_full_version");
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
      baseVersion: "0.1.4-15.Dev.9",
    }));

    const version = runDetectionInShell(envDir, "detect_appimage_version");
    assert.equal(version, "0.1.4-15.Dev.9");
  });
});

test("Fallback to filename still works when no sidecar exists", () => {
  withTestEnv((envDir) => {
    const appImagePath = path.join(envDir, "dist", "canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "fake appimage content");

    const version = runDetectionInShell(envDir, "detect_appimage_version");
    assert.equal(version, "0.1.4-14");
  });
});
