import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
const wrapperPath = path.join(rootDir, "scripts/run-c420ui.ts");

test("run-c420ui wrapper calls the project runner instead of the terminal barrel bundle", () => {
  const source = fs.readFileSync(wrapperPath, "utf8");

  assert.match(source, /runCanvaLinuxC420UI/);
  assert.doesNotMatch(source, /\.build\/packages\/c420ui\/terminal\/index\.js/);
  assert.doesNotMatch(source, /process\.getuid/);
});
