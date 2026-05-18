import assert from "node:assert/strict";
import test from "node:test";

import { formatDetectedInstallationsSummary } from "../packages/c420ui/src/terminal/detected-installations-summary";
import type { c420uiOverviewStatus } from "../packages/c420ui/src/detection";

function status(installations: c420uiOverviewStatus["installations"]): c420uiOverviewStatus {
  return {
    project: {
      version: "0.1.4-15.Dev.9",
      phase: "0.1.4-15.Dev.9",
      appId: "io.github.coletivo420.canva-linux",
      executable: "canva-linux",
      repository: "https://github.com/coletivo420/canva-linux",
    },
    installations,
    warnings: [],
  };
}

test("detected installations summary prefers flatpak full version", () => {
  const lines = formatDetectedInstallationsSummary(
    status({
      flatpakSystem: true,
      flatpakSystemVersion: "0.1.4-15.Dev.9",
      flatpakSystemFullVersion: "0.1.4-15.Dev.9+gabc1234",
    }),
    { appImageLoading: "yellow", statusDetected: "green", statusNotDetected: "magenta" },
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
    { appImageLoading: "yellow", statusDetected: "green", statusNotDetected: "magenta" },
  );

  assert.match(
    lines.join("\n"),
    /Flatpak System: .*detected.*v0\.1\.4-15\.Dev\.9/,
  );
});
