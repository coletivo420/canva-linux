import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createCanvaLinuxDetectionProvider } from "../canva-linux/c420ui-adapter/detection/provider.js";
import type { c420uiOverviewStatus } from "../c420ui/src/detection.js";
import type { InstallationDetectionResult } from "../c420ui/operations/detection/install-detection.js";

const emptyDetectionResult: InstallationDetectionResult = {
  DETECTED_NATIVE_SYSTEM: false,
  DETECTED_NATIVE_USER: false,
  DETECTED_FLATPAK_SYSTEM: false,
  DETECTED_FLATPAK_USER: false,
  DETECTED_APPIMAGE_ARTIFACTS: false,

  DETECTED_NATIVE_SYSTEM_VERSION: "",
  DETECTED_NATIVE_USER_VERSION: "",
  DETECTED_FLATPAK_SYSTEM_VERSION: "",
  DETECTED_FLATPAK_USER_VERSION: "",
  DETECTED_APPIMAGE_VERSION: "",

  DETECTED_NATIVE_SYSTEM_FULL_VERSION: "",
  DETECTED_NATIVE_USER_FULL_VERSION: "",
  DETECTED_FLATPAK_SYSTEM_FULL_VERSION: "",
  DETECTED_FLATPAK_USER_FULL_VERSION: "",
  DETECTED_APPIMAGE_FULL_VERSION: "",
};

function createProjectRoot(): string {
  const rootDir = mkdtempSync(path.join(tmpdir(), "canva-linux-detection-"));
  mkdirSync(path.join(rootDir, "build-resources/canva-linux/config"), { recursive: true });
  writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "canva-linux", version: "0.1.4-14" }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(rootDir, "build-resources/canva-linux/config/project-ui.json"),
    `${JSON.stringify({ phase: "0.1.4-14" }, null, 2)}\n`,
  );
  return rootDir;
}

function withProjectRoot(run: (rootDir: string) => void): void {
  const rootDir = createProjectRoot();
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

test("provider maps native system detection", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_NATIVE_SYSTEM: true,
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, true);
  });
});

test("provider maps flatpak system detection", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_FLATPAK_SYSTEM: true,
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.flatpakSystem, true);
  });
});

test("provider returns safe status with warning when detection throws", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => {
      throw new Error("detection failed");
    };
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystem, false);
    assert.match(status.warnings.join("\n"), /detection failed/);
  });
});

test("provider exposes Canva Linux metadata", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => emptyDetectionResult;
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.project.appId, "io.github.coletivo420.canva-linux");
    assert.equal(status.project.executable, "canva-linux");
    assert.equal(status.project.version, "0.1.4-14");
  });
});


test("provider status does not expose legacy package field", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => emptyDetectionResult;
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal("package" in status, false);
  });
});

test("provider maps detected full versions", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_FLATPAK_SYSTEM: true,
      DETECTED_FLATPAK_SYSTEM_VERSION: "0.1.4-15.Dev.9",
      DETECTED_FLATPAK_SYSTEM_FULL_VERSION: "0.1.4-15.Dev.9+gabc1234",
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.flatpakSystemVersion, "0.1.4-15.Dev.9");
    assert.equal(status.installations.flatpakSystemFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps native system full version", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_NATIVE_SYSTEM: true,
      DETECTED_NATIVE_SYSTEM_FULL_VERSION: "0.1.4-15.Dev.9+gabc1234",
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeSystemFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps native user full version", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_NATIVE_USER: true,
      DETECTED_NATIVE_USER_FULL_VERSION: "0.1.4-15.Dev.9+gabc1234",
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.nativeUserFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});

test("provider maps appimage full version", () => {
  withProjectRoot((rootDir) => {
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_APPIMAGE_ARTIFACTS: true,
      DETECTED_APPIMAGE_FULL_VERSION: "0.1.4-15.Dev.9+gabc1234",
    });
    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.appImageFullVersion, "0.1.4-15.Dev.9+gabc1234");
  });
});


test("provider keeps appImageVersion as base and appImageFullVersion as effective version from artifact fragment", () => {
  withProjectRoot((rootDir) => {
    writeFileSync(
      path.join(rootDir, "build-resources/canva-linux/config/artifacts.json"),
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
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_APPIMAGE_ARTIFACTS: false,
      DETECTED_APPIMAGE_VERSION: "0.1.4-14+glegacy",
      DETECTED_APPIMAGE_FULL_VERSION: "0.1.4-14+glegacy",
    });

    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

    assert.equal(status.installations.appImageVersion, "0.1.4-14");
    assert.equal(status.installations.appImageFullVersion, "0.1.4-14+gfragment");
  });
});

test("provider exposes artifactFragments and derives legacy appImageArtifacts from them", () => {
  withProjectRoot((rootDir) => {
    writeFileSync(
      path.join(rootDir, "build-resources/canva-linux/config/artifacts.json"),
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
    const detectInstallations = () => ({
      ...emptyDetectionResult,
      DETECTED_APPIMAGE_ARTIFACTS: false,
    });

    const status = createCanvaLinuxDetectionProvider({ detectInstallations }).buildOverviewStatus(rootDir) as c420uiOverviewStatus;

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
