import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const shellPath = path.join(
  repoRoot,
  "build-resources",
  "electron",
  "main",
  "shell.ts",
);
const indexPath = path.join(
  repoRoot,
  "build-resources",
  "electron",
  "main",
  "index.ts",
);

test("toolbar shell logs preload errors", () => {
  const source = fs.readFileSync(shellPath, "utf8");

  assert.match(source, /"preload-error"/);
  assert.match(source, /"toolbar-preload-error"/);
});

test("toolbar shell does not intercept fallback navigation actions", () => {
  const source = fs.readFileSync(shellPath, "utf8");

  assert.doesNotMatch(source, /canva-toolbar:\/\//);
  assert.doesNotMatch(source, /handleToolbarAction/);
});

test("toolbar state broadcast uses IPC without main render injection", () => {
  const source = fs.readFileSync(indexPath, "utf8");

  assert.match(source, /webContents\.send\("tabs-state"/);
  assert.doesNotMatch(source, /__canvaToolbarRenderState/);
});
