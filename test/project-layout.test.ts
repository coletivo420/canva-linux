import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

test("root legacy layout directories do not exist", () => {
  for (const relativePath of ["electron", "build-resources", "data"] as const) {
    assert.equal(exists(relativePath), false, `${relativePath} must not exist at the repository root`);
  }
});

test("electron runtime and packaging assets live in the canonical packages layout", () => {
  for (const relativePath of [
    "packages/electron/main",
    "packages/electron/preload",
    "packages/electron/shared",
    "packages/electron/ui",
    "packages/electron/assets",
    "packages/canva-linux-assets/desktop",
    "packages/canva-linux-assets/metainfo",
    "packages/canva-linux-assets/icons",
  ] as const) {
    assert.equal(exists(relativePath), true, `${relativePath} must exist`);
  }
});
