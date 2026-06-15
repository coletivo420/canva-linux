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

test("toolbar shell does not configure toolbar preload", () => {
  const source = fs.readFileSync(shellPath, "utf8");

  assert.doesNotMatch(source, /preloadPath/);
  assert.doesNotMatch(source, /preload:\s*preloadPath/);
});

test("toolbar shell intercepts and validates navigation actions", () => {
  const source = fs.readFileSync(shellPath, "utf8");

  assert.match(source, /"will-navigate"/);
  assert.match(source, /canva-toolbar:\/\//);
  assert.match(source, /handleToolbarAction/);
  assert.match(source, /parseToolbarActionUrl/);
  assert.match(source, /Number\.isSafeInteger/);
  assert.match(source, /toolbar-url-action/);
  assert.match(source, /toolbar-url-action-invalid/);
});

test("toolbar state broadcast applies through main-driven state injection", () => {
  const source = fs.readFileSync(indexPath, "utf8");

  assert.doesNotMatch(source, /webContents\.send\("tabs-state"/);
  assert.match(source, /executeJavaScript/);
  assert.match(source, /__canvaToolbarApplyState/);
  assert.match(source, /serializeToolbarStateForJavaScript/);
  assert.match(source, /toolbar-state-apply-failed/);
});
