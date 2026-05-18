import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDetectedInstallationsSummary,
  formatDetectionPanelSummaries,
} from "../src/terminal/detected-installations-summary";
import type { c420uiOverviewStatus } from "../src/detection";

function status(
  installations: c420uiOverviewStatus["installations"],
  artifactFragments?: c420uiOverviewStatus["artifactFragments"],
): c420uiOverviewStatus {
  return {
    project: {
      version: "0.1.4-15.Dev.9",
      phase: "0.1.4-15.Dev.9",
      appId: "io.github.coletivo420.canva-linux",
      executable: "canva-linux",
      repository: "https://github.com/coletivo420/canva-linux",
    },
    installations,
    ...(artifactFragments ? { artifactFragments } : {}),
    warnings: [],
  };
}

const colors = { appImageLoading: "yellow", statusDetected: "green", statusNotDetected: "magenta" };

test("detected installations summary prefers flatpak full version", () => {
  const panels = formatDetectionPanelSummaries(
    status({
      flatpakSystem: true,
      flatpakSystemVersion: "0.1.4-15.Dev.9",
      flatpakSystemFullVersion: "0.1.4-15.Dev.9+gabc1234",
    }),
    colors,
  );

  assert.match(
    panels.detectedInstallations.join("\n"),
    /Flatpak System: .*detected.*v0\.1\.4-15\.Dev\.9\+gabc1234/,
  );
});

test("detected installations summary falls back to base version", () => {
  const panels = formatDetectionPanelSummaries(
    status({
      flatpakSystem: true,
      flatpakSystemVersion: "0.1.4-15.Dev.9",
    }),
    colors,
  );

  assert.match(
    panels.detectedInstallations.join("\n"),
    /Flatpak System: .*detected.*v0\.1\.4-15\.Dev\.9/,
  );
});

test("renders Detected Installations in its own panel", () => {
  const panels = formatDetectionPanelSummaries(status({}), colors);
  const text = panels.detectedInstallations.join("\n");

  assert.match(text, /Native System:/);
  assert.match(text, /Native User:/);
  assert.doesNotMatch(text, /Generated Artifacts|Linux Artifacts|Detected Installations/);
});

test("renders Generated Artifacts in its own panel", () => {
  const panels = formatDetectionPanelSummaries(
    status(
      { appImageArtifacts: true, appImageFullVersion: "legacy-appimage" },
      [
        {
          id: "flatpak",
          kind: "flatpak",
          label: "Flatpak bundle",
          detected: true,
          fullVersion: "0.1.4-15.Dev.9+gflatpak",
        },
        {
          id: "appimage",
          kind: "appimage",
          label: "AppImage",
          detected: true,
          version: "0.1.4-15.Dev.9",
          fullVersion: "0.1.4-15.Dev.9+gappimage",
        },
        {
          id: "linux-unpacked",
          kind: "linux-unpacked",
          label: "Linux unpacked",
          detected: true,
          fullVersion: "0.1.4-15.Dev.9+gunpacked",
        },
      ],
    ),
    colors,
  );
  const text = panels.generatedArtifacts.join("\n");

  assert.match(text, /Flatpak bundle: .*detected.*v0\.1\.4-15\.Dev\.9\+gflatpak/);
  assert.match(text, /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9\+gappimage/);
  assert.doesNotMatch(text, /Linux unpacked/);
  assert.doesNotMatch(text, /Generated Artifacts|Detected Installations|Linux Artifacts/);
});

test("renders Linux Artifacts in its own panel", () => {
  const panels = formatDetectionPanelSummaries(
    status(
      {
        nativeSystem: true,
        nativeSystemFullVersion: "0.1.4-15.Dev.9+gnative",
        nativeUser: false,
      },
      [{ id: "linux-unpacked", kind: "linux-unpacked", label: "Linux unpacked", detected: true, fullVersion: "0.1.4-15.Dev.9+gunpacked" }],
    ),
    colors,
  );
  const text = panels.linuxArtifacts.join("\n");

  assert.equal(panels.linuxArtifacts.length, 1);
  assert.match(text, /Native system installation v0\.1\.4-15\.Dev\.9\+gnative/);
  assert.match(text, /Native user installation not detected/);
  assert.match(text, /Linux unpacked v0\.1\.4-15\.Dev\.9\+gunpacked/);
  assert.doesNotMatch(text, /Linux Artifacts|Detected Installations|Generated Artifacts/);
});

test("does not repeat panel titles inside panel content", () => {
  const panels = formatDetectionPanelSummaries(status({}), colors);
  const content = [
    ...panels.detectedInstallations,
    ...panels.generatedArtifacts,
    ...panels.linuxArtifacts,
  ].join("\n");

  assert.doesNotMatch(content, /Detected Installations/);
  assert.doesNotMatch(content, /Generated Artifacts/);
  assert.doesNotMatch(content, /Linux Artifacts/);
});

test("renders Linux Artifacts as comma-separated artifact/version summary", () => {
  const panels = formatDetectionPanelSummaries(
    status(
      {
        nativeSystem: true,
        nativeSystemFullVersion: "0.1.4-15.Dev.9+gnative",
        nativeUser: false,
      },
      [{ id: "linux-unpacked", kind: "linux-unpacked", label: "Linux unpacked", detected: true, fullVersion: "0.1.4-15.Dev.9+gunpacked" }],
    ),
    colors,
  );

  assert.equal(
    panels.linuxArtifacts[0],
    "Native system installation v0.1.4-15.Dev.9+gnative, Native user installation not detected, Linux unpacked v0.1.4-15.Dev.9+gunpacked",
  );
});

test("Linux Artifacts falls back safely to version unknown", () => {
  const panels = formatDetectionPanelSummaries(
    status(
      {},
      [{ id: "linux-unpacked", kind: "linux-unpacked", label: "Linux unpacked", detected: true }],
    ),
    colors,
  );

  assert.match(panels.linuxArtifacts[0], /Linux unpacked version unknown/);
});

test("artifact summary falls back to artifact version", () => {
  const panels = formatDetectionPanelSummaries(
    status({}, [{ id: "appimage", kind: "appimage", label: "AppImage", detected: true, version: "0.1.4-15.Dev.9" }]),
    colors,
  );

  assert.match(panels.generatedArtifacts.join("\n"), /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9/);
});

test("preserves legacy appImageArtifacts fallback", () => {
  const panels = formatDetectionPanelSummaries(
    status({
      appImageArtifacts: true,
      appImageVersion: "0.1.4-15.Dev.9",
      appImageFullVersion: "0.1.4-15.Dev.9+glegacy",
    }),
    colors,
  );
  const text = panels.generatedArtifacts.join("\n");

  assert.match(text, /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9\+glegacy/);
});

test("does not duplicate AppImage when artifactFragments exist", () => {
  const panels = formatDetectionPanelSummaries(
    status(
      {
        appImageArtifacts: true,
        appImageFullVersion: "0.1.4-15.Dev.9+glegacy",
      },
      [{ id: "appimage", kind: "appimage", label: "AppImage", detected: true, fullVersion: "0.1.4-15.Dev.9+gfragment" }],
    ),
    colors,
  );

  assert.equal(panels.generatedArtifacts.filter((line) => line.includes("AppImage:")).length, 1);
  assert.match(panels.generatedArtifacts.join("\n"), /AppImage: .*gfragment/);
  assert.doesNotMatch(panels.generatedArtifacts.join("\n"), /glegacy/);
});

test("loading state uses Native System/User and Flatpak System/User labels", () => {
  const panels = formatDetectionPanelSummaries(null, colors);
  const text = panels.detectedInstallations.join("\n");

  assert.match(text, /Native System: .*loading/);
  assert.match(text, /Native User: .*loading/);
  assert.match(text, /Flatpak System: .*loading/);
  assert.match(text, /Flatpak User: .*loading/);
  assert.match(panels.generatedArtifacts.join("\n"), /AppImage: .*loading/);
  assert.doesNotMatch(text, /Native Install/);
  assert.doesNotMatch(text, /Flatpak Install/);
});


test("loading state keeps Linux Artifacts compact", () => {
  const panels = formatDetectionPanelSummaries(null, colors);

  assert.deepEqual(panels.linuxArtifacts, ["Native/Unpacked installations loading..."]);
});

test("planned artifact renders as not detected", () => {
  const panels = formatDetectionPanelSummaries(
    status({}, [{ id: "deb", kind: "deb", label: "Debian package", detected: false }]),
    colors,
  );

  assert.match(panels.generatedArtifacts.join("\n"), /Debian package: .*not detected/);
});

test("legacy combined summary still includes panel labels for callers that need a single string", () => {
  const lines = formatDetectedInstallationsSummary(status({}), colors);

  assert.ok(lines.includes("Detected Installations"));
  assert.ok(lines.includes("Generated Artifacts"));
  assert.ok(lines.includes("Linux Artifacts"));
});
