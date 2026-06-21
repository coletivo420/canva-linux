import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rust-session-log wrapper delegates read write and clear to c420ui-host", () => {
  const source = fs.readFileSync(
    path.join("build-resources", "c420ui", "src", "rust-session-log.ts"),
    "utf8",
  );
  assert.match(source, /command: "session-log-read"/);
  assert.match(source, /command: "session-log-write"/);
  assert.match(source, /command: "session-log-clear"/);
  assert.doesNotMatch(source, /tool-session\.log/);
});
