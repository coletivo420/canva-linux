import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("detected-installations-summary is a deprecated Rust status bridge", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui/src/terminal/detected-installations-summary.ts"),
    "utf8",
  );

  assert.match(source, /createC420UIRustStatusPanels/);
  assert.doesNotMatch(source, /\{green-fg\}|\{orange-fg\}|\{red-fg\}/);
  assert.doesNotMatch(source, /GENERATED_ARTIFACT_KINDS|formatDetectedStatus|isGeneratedArtifactFragment/);
});

test("rust-tui-runner uses rust-status-panels as status source", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts"),
    "utf8",
  );

  assert.match(source, /createC420UIRustStatusPanels/);
  assert.doesNotMatch(source, /stripBlessedTags|formatDetectionPanelSummaries/);
});
