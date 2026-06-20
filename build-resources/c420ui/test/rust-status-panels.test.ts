import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rust-status-panels wrapper calls c420ui-host status-panels --json", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-status-panels.ts"),
    "utf8",
  );

  assert.match(source, /command: "status-panels"/);
  assert.match(source, /overviewStatus: options\.overviewStatus/);
  assert.doesNotMatch(source, /not detected|green-fg|orange-fg|red-fg/);
});

test("rust-tui-runner uses rust-status-panels", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-runner.ts"),
    "utf8",
  );

  assert.match(source, /createC420UIRustStatusPanels/);
  assert.doesNotMatch(source, /formatDetectionPanelSummaries|stripBlessedTags/);
});
