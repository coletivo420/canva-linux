import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

test("status hash display policy is owned by Rust semantic renderer", () => {
  const widgets = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui-rs/src/tui/widgets.rs"),
    "utf8",
  );
  const statusArtifacts = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui-rs/src/status/artifacts.rs"),
    "utf8",
  );

  assert.match(widgets, /short_hash/);
  assert.match(widgets, /styled_semantic_status_line/);
  assert.match(statusArtifacts, /with_hash/);
});

test("TypeScript summaries do not inject terminal color tags for hashes", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui/src/terminal/detected-installations-summary.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /\{[a-z-]+-fg\}/);
});
