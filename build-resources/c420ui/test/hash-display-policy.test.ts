import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createCanvaLinuxC420UIAdapter } from "../../canva-linux/c420ui-adapter/adapter.js";
import { formatDetectionPanelSummaries } from "../src/terminal/detected-installations-summary.js";
import type { c420uiOverviewStatus } from "../src/detection.js";

const colors = {
  appImageLoading: "yellow",
  statusDetected: "green",
  statusNotDetected: "magenta",
};

function status(
  installations: c420uiOverviewStatus["installations"],
  artifactFragments?: c420uiOverviewStatus["artifactFragments"],
): c420uiOverviewStatus {
  return {
    project: {
      version: "0.1.4-15.Dev.12",
      phase: "0.1.4-15.Dev.12",
      appId: "io.github.coletivo420.canva-linux",
      executable: "canva-linux",
      repository: "https://github.com/coletivo420/canva-linux",
    },
    installations,
    artifactFragments,
    warnings: [],
  };
}

test("detected installation shows version and canvaLinuxSourceHash", () => {
  const panels = formatDetectionPanelSummaries(
    status({
      nativeSystem: true,
      nativeSystemFullVersion: "0.1.4-15.Dev.12",
      nativeSystemHash: "sha256:abc123456789",
      nativeSystemHashKind: "canvaLinuxSourceHash",
    }),
    colors,
  );

  assert.match(
    panels.detectedInstallations.join("\n"),
    /Native System: .*v0\.1\.4-15\.Dev\.11 · sha256:abc12345/,
  );
});

test("Linux Unpacked shows canvaLinuxSourceHash", () => {
  const panels = formatDetectionPanelSummaries(
    status({}, [
      {
        id: "linux-unpacked",
        kind: "linux-unpacked",
        label: "Linux unpacked",
        detected: true,
        fullVersion: "0.1.4-15.Dev.12",
        hash: "sha256:linuxhash",
        hashKind: "canvaLinuxSourceHash",
      },
    ]),
    colors,
  );

  assert.match(
    panels.linuxArtifacts[0],
    /Linux unpacked v0\.1\.4-15\.Dev\.11 · sha256:linuxhas/,
  );
});

test("c420ui local version shows c420uiSourceHash", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-hash-display-"));
  try {
    fs.mkdirSync(path.join(rootDir, ".build/canva-linux"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "build-resources/canva-linux/config"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "build-resources/c420ui"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "package.json"),
      `${JSON.stringify({ name: "canva-linux", version: "0.1.4-15.Dev.12" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "build-resources/c420ui/package.json"),
      `${JSON.stringify({ name: "@coletivo420/c420ui", version: "0.1.0" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "build-resources/canva-linux/config/project-ui.json"),
      `${JSON.stringify({
        displayVersion: "0.1.4-15.Dev.12",
        phase: "0.1.4-15.Dev.12",
        projectName: "Canva Linux",
        projectSubtitle: "Desktop wrapper",
        c420uiTitle: "Canva Linux",
        stateDirectoryName: "canva-linux",
        appId: "io.github.coletivo420.canva-linux",
        executableName: "canva-linux",
        repositoryUrl: "https://github.com/coletivo420/canva-linux",
        launcherCommand: "canva-linux",
        logoLines: [],
        versionReleaseNotes: "",
      }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, ".build/canva-linux/build-metadata.effective.json"),
      `${JSON.stringify({
        baseVersion: "0.1.4-15.Dev.12",
        baseDisplayVersion: "0.1.4-15.Dev.12",
        basePhase: "0.1.4-15.Dev.12",
        buildRevision: "unknown",
        canvaLinuxSourceHash: "sha256:canvalinuxhash",
        c420uiSourceHash: "sha256:c420uihash",
        combinedSourceHash: "sha256:combinedhash",
      }, null, 2)}\n`,
    );

    const adapter = createCanvaLinuxC420UIAdapter(rootDir);
    const brand = adapter.loadBrandConfig();
    const project = adapter.loadProjectConfig();

    assert.equal(brand.version, "0.1.0");
    assert.equal(brand.hash, "sha256:c420uihash");
    assert.equal(brand.hashKind, "c420uiSourceHash");
    assert.equal(project.hash, "sha256:canvalinuxhash");
    assert.equal(project.hashKind, "canvaLinuxSourceHash");
    assert.equal(project.combinedHash, "sha256:combinedhash");
    assert.equal(project.combinedHashKind, "combinedSourceHash");
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("generated artifacts show version and hash", () => {
  const panels = formatDetectionPanelSummaries(
    status({}, [
      {
        id: "appimage",
        kind: "appimage",
        label: "AppImage",
        detected: true,
        fullVersion: "0.1.4-15.Dev.12",
        hash: "sha256:appimagehash",
        hashKind: "canvaLinuxSourceHash",
      },
      {
        id: "flatpak",
        kind: "flatpak",
        label: "Flatpak bundle",
        detected: true,
        fullVersion: "0.1.4-15.Dev.12",
        hash: "sha256:flatpakhash",
        hashKind: "canvaLinuxSourceHash",
      },
    ]),
    colors,
  );

  const text = panels.generatedArtifacts.join("\n");
  assert.match(text, /AppImage: .*v0\.1\.4-15\.Dev\.11 · sha256:appimage/);
  assert.match(text, /Flatpak bundle: .*v0\.1\.4-15\.Dev\.11 · sha256:flatpakh/);
});

test("missing hash falls back to unknown only when metadata is absent", () => {
  const withMissingHash = formatDetectionPanelSummaries(
    status({
      nativeSystem: true,
      nativeSystemFullVersion: "0.1.4-15.Dev.12",
      nativeSystemHash: "unknown",
      nativeSystemHashKind: "canvaLinuxSourceHash",
    }),
    colors,
  );
  assert.match(
    withMissingHash.detectedInstallations.join("\n"),
    /Native System: .*v0\.1\.4-15\.Dev\.11 · unknown/,
  );

  const withoutVersion = formatDetectionPanelSummaries(
    status({
      nativeSystem: true,
    }),
    colors,
  );
  assert.match(
    withoutVersion.detectedInstallations.join("\n"),
    /Native System: version unknown/,
  );
});
