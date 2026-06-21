import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rust-settings wrapper delegates get and set to c420ui-host", () => {
  const source = fs.readFileSync(
    path.join("build-resources", "c420ui", "src", "rust-settings.ts"),
    "utf8",
  );
  assert.match(source, /command: "settings-get"/);
  assert.match(source, /command: "settings-set"/);
  assert.doesNotMatch(source, /writeFileSync/);
  assert.doesNotMatch(source, /readFileSync/);
});
