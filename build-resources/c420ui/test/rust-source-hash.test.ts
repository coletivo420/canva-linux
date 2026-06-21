import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rust-source-hash wrapper delegates source hash calculation to c420ui-host", () => {
  const source = fs.readFileSync(
    path.join("build-resources", "c420ui", "src", "rust-source-hash.ts"),
    "utf8",
  );
  assert.match(source, /command: "source-hash"/);
  assert.doesNotMatch(source, /createHash/);
  assert.doesNotMatch(source, /readdirSync/);
});
