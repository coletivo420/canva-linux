import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const appSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/terminal/app.ts"), "utf8");

test("renders Detected Installations in its own panel", () => {
  assert.match(appSource, /label: "Detected Installations"/);
  assert.match(appSource, /diagnostics\.setContent\(panels\.detectedInstallations\.join/);
});

test("Detected Installations panel is tall enough for all install rows", () => {
  assert.match(appSource, /const DETECTED_INSTALLATION_ROWS = 4/);
  assert.match(appSource, /DETECTED_INSTALLATIONS_MIN_HEIGHT[\s\S]*DETECTED_INSTALLATION_ROWS \+ PANEL_VERTICAL_FRAME_ROWS/);
  assert.match(appSource, /Math\.max\(\s*DETECTED_INSTALLATIONS_MIN_HEIGHT,\s*Math\.floor\(detectionPanelsHeight \* 0\.34\),\s*\)/);
});

test("renders Generated Artifacts in its own panel", () => {
  assert.match(appSource, /const generatedArtifacts = tui\.box/);
  assert.match(appSource, /label: "Generated Artifacts"/);
  assert.match(appSource, /generatedArtifacts\.setContent\(panels\.generatedArtifacts\.join/);
});

test("renders Linux Artifacts in its own panel", () => {
  assert.match(appSource, /const linuxArtifacts = tui\.box/);
  assert.match(appSource, /label: "Linux Artifacts"/);
  assert.match(appSource, /linuxArtifacts\.setContent\(panels\.linuxArtifacts\.join/);
});

test("footer does not include F6 Plain Logs", () => {
  assert.doesNotMatch(appSource, /F6.*Plain Logs|Plain Logs.*F6/);
});
