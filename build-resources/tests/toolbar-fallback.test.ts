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

test("toolbar shell intercepts fallback navigation actions", () => {
  const source = fs.readFileSync(shellPath, "utf8");

  assert.match(source, /"will-navigate"/);
  assert.match(source, /canva-toolbar:\/\//);
  assert.match(source, /handleToolbarAction/);
  assert.match(source, /toolbar-fallback-action/);
});

test("toolbar state broadcast also renders through main fallback", () => {
  const source = fs.readFileSync(indexPath, "utf8");

  assert.match(source, /webContents\.send\("tabs-state"/);
  assert.match(source, /executeJavaScript/);
  assert.match(source, /__canvaToolbarRenderState/);
  assert.match(source, /toolbar-main-render-failed/);
});
