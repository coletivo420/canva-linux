// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");
const toolbarPreloadPath = path.join(
  repoRoot,
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
