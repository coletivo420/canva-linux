import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from "node:child_process";

import { createCanvaLinuxDetectionProvider } from "../scripts/c420ui-adapter/detection/provider";
import type { c420uiOverviewStatus } from "../packages/c420ui/src/detection";

type FakeRunCommand = (
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) => SpawnSyncReturns<string>;

function createProjectRoot(): string {
  const rootDir = mkdtempSync(path.join(tmpdir(), "canva-linux-detection-"));
  mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
  mkdirSync(path.join(rootDir, "config/canva-linux"), { recursive: true });
  writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "canva-linux", version: "0.1.4-14" }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    'PROJECT_PHASE="0.1.4-14"\n',
  );
  return rootDir;
}

function fakeResult(partial: Partial<SpawnSyncReturns<string>>): SpawnSyncReturns<string> {
  return {
    pid: 1,
    output: [null, partial.stdout ?? "", partial.stderr ?? ""],
    stdout: partial.stdout ?? "",
    stderr: partial.stderr ?? "",
    status: partial.status ?? 0,
    signal: partial.signal ?? null,
    error: partial.error,
  };
}

function withProjectRoot(run: (rootDir: string) => void): void {
  const rootDir = createProjectRoot();
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

test("provider maps native system detection from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({ stdout: "DETECTED_NATIVE_SYSTEM=true\n" });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, true);
  });
});

test("provider maps flatpak system detection from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({ stdout: "DETECTED_FLATPAK_SYSTEM=true\n" });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.flatpakSystem, true);
  });
});

test("provider converts stderr to warnings", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () => fakeResult({ stderr: "detector warning\n" });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.deepEqual(status.warnings, ["detector warning"]);
  });
});

test("provider returns valid status with warning for non-zero exit", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({ status: 2, stdout: "DETECTED_NATIVE_SYSTEM=true\n" });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, true);
    assert.match(status.warnings.join("\n"), /exited with status 2/);
  });
});

test("provider returns safe status with warning when spawn throws", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () => {
      throw new Error("spawn failed");
    };
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, false);
    assert.match(status.warnings.join("\n"), /spawn failed/);
  });
});

test("provider exposes Canva Linux metadata", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () => fakeResult({});
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.project.appId, "io.github.coletivo420.canva-linux");
    assert.equal(status.project.executable, "canva-linux");
    assert.equal(status.project.version, "0.1.4-14");
  });
});


test("provider status does not expose legacy package field", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () => fakeResult({});
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal("package" in status, false);
  });
});

test("provider ignores unknown detected keys", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: "DETECTED_NATIVE_SYSTEM=true\nDETECTED_UNKNOWN=true\n",
      });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, true);
    assert.equal("unknown" in status.installations, false);
    assert.equal("DETECTED_UNKNOWN" in status.installations, false);
  });
});

test("provider maps detected full versions from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: [
          "DETECTED_FLATPAK_SYSTEM=true",
          "DETECTED_FLATPAK_SYSTEM_VERSION=0.1.4-15.Dev.9",
          "DETECTED_FLATPAK_SYSTEM_FULL_VERSION=0.1.4-15.Dev.9+gabc1234",
        ].join("\n"),
      });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.flatpakSystemVersion, "0.1.4-15.Dev.9");
    assert.equal(status.installations.flatpakSystemFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps native system full version from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: [
          "DETECTED_NATIVE_SYSTEM=true",
          "DETECTED_NATIVE_SYSTEM_FULL_VERSION=0.1.4-15.Dev.9+gabc1234",
        ].join("\n"),
      });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystemFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps native user full version from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: [
          "DETECTED_NATIVE_USER=true",
          "DETECTED_NATIVE_USER_FULL_VERSION=0.1.4-15.Dev.9+gabc1234",
        ].join("\n"),
      });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeUserFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps appimage full version from stdout", () => {
  withProjectRoot((rootDir) => {
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: [
          "DETECTED_APPIMAGE_ARTIFACTS=true",
          "DETECTED_APPIMAGE_FULL_VERSION=0.1.4-15.Dev.9+gabc1234",
        ].join("\n"),
      });
    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.appImageFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});


test("provider keeps appImageVersion as base and appImageFullVersion as effective version from artifact fragment", () => {
  withProjectRoot((rootDir) => {
    writeFileSync(
      path.join(rootDir, "config/canva-linux/artifacts.json"),
      `${JSON.stringify({
        workflows: [
          {
            id: "appimage",
            kind: "appimage",
            label: "AppImage",
            outputPattern: "dist/canva-linux-*.AppImage",
          },
        ],
      }, null, 2)}\n`,
    );
    mkdirSync(path.join(rootDir, "dist"), { recursive: true });
    const appImagePath = path.join(rootDir, "dist/canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "appimage");
    writeFileSync(
      `${appImagePath}.build-metadata.json`,
      JSON.stringify({
        baseVersion: "0.1.4-14",
        version: "0.1.4-14+gfragment",
        fullVersion: "0.1.4-14+gfragment",
      }),
    );
    const runCommand: FakeRunCommand = () =>
      fakeResult({
        stdout: [
          "DETECTED_APPIMAGE_ARTIFACTS=false",
          "DETECTED_APPIMAGE_VERSION=0.1.4-14+glegacy",
          "DETECTED_APPIMAGE_FULL_VERSION=0.1.4-14+glegacy",
        ].join("\n"),
      });

    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.appImageVersion, "0.1.4-14");
    assert.equal(status.installations.appImageFullVersion, "0.1.4-14+gfragment");
  });
});

test("provider exposes artifactFragments and derives legacy appImageArtifacts from them", () => {
  withProjectRoot((rootDir) => {
    writeFileSync(
      path.join(rootDir, "config/canva-linux/artifacts.json"),
      `${JSON.stringify({
        workflows: [
          {
            id: "appimage",
            kind: "appimage",
            label: "AppImage",
            outputPattern: "dist/canva-linux-*.AppImage",
          },
          { id: "deb", kind: "deb", label: "Debian package", planned: true },
        ],
      }, null, 2)}\n`,
    );
    mkdirSync(path.join(rootDir, "dist"), { recursive: true });
    const appImagePath = path.join(rootDir, "dist/canva-linux-0.1.4-14-x86_64.AppImage");
    writeFileSync(appImagePath, "appimage");
    writeFileSync(`${appImagePath}.version`, "0.1.4-14+gfragment\n");
    const runCommand: FakeRunCommand = () => fakeResult({ stdout: "DETECTED_APPIMAGE_ARTIFACTS=false\n" });

    const status = createCanvaLinuxDetectionProvider({ runCommand }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.appImageArtifacts, true);
    assert.equal(status.installations.appImageVersion, "0.1.4-14+gfragment");
    assert.equal(status.artifactFragments?.find((item) => item.id === "appimage")?.detected, true);
    assert.deepEqual(status.artifactFragments?.find((item) => item.id === "deb"), {
      id: "deb",
      kind: "deb",
      label: "Debian package",
      detected: false,
    });
  });
});
