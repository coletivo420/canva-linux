import assert from "node:assert/strict";
import test from "node:test";

import { formatDetectedInstallationsSummary } from "../packages/c420ui/src/terminal/detected-installations-summary";
import type { c420uiOverviewStatus } from "../packages/c420ui/src/detection";

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
  const lines = formatDetectedInstallationsSummary(
    status({
      flatpakSystem: true,
      flatpakSystemVersion: "0.1.4-15.Dev.9",
      flatpakSystemFullVersion: "0.1.4-15.Dev.9+gabc1234",
    }),
    colors,
  );

  assert.match(
    lines.join("\n"),
    /Flatpak System: .*detected.*v0\.1\.4-15\.Dev\.9\+gabc1234/,
  );
});

test("detected installations summary falls back to base version", () => {
  const lines = formatDetectedInstallationsSummary(
    status({
      flatpakSystem: true,
      flatpakSystemVersion: "0.1.4-15.Dev.9",
    }),
    colors,
  );

  assert.match(
    lines.join("\n"),
    /Flatpak System: .*detected.*v0\.1\.4-15\.Dev\.9/,
  );
});

test("renders Generated Artifacts from artifactFragments", () => {
  const lines = formatDetectedInstallationsSummary(
    status(
      {
        nativeSystem: true,
        nativeSystemFullVersion: "0.1.4-15.Dev.9+gnative",
        appImageArtifacts: true,
        appImageFullVersion: "legacy-appimage",
      },
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
  const text = lines.join("\n");

  assert.match(text, /Generated Artifacts/);
  assert.match(text, /Flatpak bundle: .*detected.*v0\.1\.4-15\.Dev\.9\+gflatpak/);
  assert.match(text, /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9\+gappimage/);
  assert.match(text, /Linux unpacked: .*detected.*v0\.1\.4-15\.Dev\.9\+gunpacked/);
});

test("artifact summary falls back to artifact version", () => {
  const lines = formatDetectedInstallationsSummary(
    status({}, [{ id: "appimage", kind: "appimage", label: "AppImage", detected: true, version: "0.1.4-15.Dev.9" }]),
    colors,
  );

  assert.match(lines.join("\n"), /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9/);
});

test("preserves legacy appImageArtifacts fallback", () => {
  const lines = formatDetectedInstallationsSummary(
    status({
      appImageArtifacts: true,
      appImageVersion: "0.1.4-15.Dev.9",
      appImageFullVersion: "0.1.4-15.Dev.9+glegacy",
    }),
    colors,
  );
  const text = lines.join("\n");

  assert.match(text, /Generated Artifacts/);
  assert.match(text, /AppImage: .*detected.*v0\.1\.4-15\.Dev\.9\+glegacy/);
});

test("does not duplicate AppImage when artifactFragments exist", () => {
  const lines = formatDetectedInstallationsSummary(
    status(
      {
        appImageArtifacts: true,
        appImageFullVersion: "0.1.4-15.Dev.9+glegacy",
      },
      [{ id: "appimage", kind: "appimage", label: "AppImage", detected: true, fullVersion: "0.1.4-15.Dev.9+gfragment" }],
    ),
    colors,
  );

  assert.equal(lines.filter((line) => line.includes("AppImage:")).length, 1);
  assert.match(lines.join("\n"), /AppImage: .*gfragment/);
  assert.doesNotMatch(lines.join("\n"), /glegacy/);
});
