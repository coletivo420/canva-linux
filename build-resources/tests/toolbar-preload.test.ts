// @ts-nocheck
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

test("toolbar state subscription removes only its previous tabs-state listener", () => {
  const source = fs.readFileSync(toolbarPreloadPath, "utf8");

  assert.match(source, /let tabsStateListener:/);
  assert.match(
    source,
    /ipcRenderer\.removeListener\([\"']tabs-state[\"'], tabsStateListener\)/,
  );
  assert.doesNotMatch(source, /removeAllListeners\([\"']tabs-state[\"']\)/);
});
