import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const toolbarPreloadPath = path.join(
  repoRoot,
  "build-resources",
  "electron",
  "preload",
  "toolbar.ts",
);
const toolbarHtmlPath = path.join(
  repoRoot,
  "build-resources",
  "electron",
  "ui",
  "toolbar.html",
);

test("toolbar preload source is removed", () => {
  assert.equal(fs.existsSync(toolbarPreloadPath), false);
});

test("toolbar html does not depend on canvaTabs bridge", () => {
  const source = fs.readFileSync(toolbarHtmlPath, "utf8");

  assert.doesNotMatch(source, /canvaTabs/);
  assert.doesNotMatch(source, /subscribeTabsState/);
  assert.doesNotMatch(source, /toolbar-action/);
});
