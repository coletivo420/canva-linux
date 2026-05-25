import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

test("root legacy layout directories do not exist", () => {
  for (const relativePath of ["packages", "electron", "data"] as const) {
    assert.equal(exists(relativePath), false, `${relativePath} must not exist at the repository root`);
  }
});

test("electron runtime and packaging assets live in the canonical build-resources layout", () => {
  for (const relativePath of [
    "build-resources/c420ui",
    "build-resources/electron/main",
    "build-resources/electron/preload",
    "build-resources/electron/shared",
    "build-resources/electron/ui",
    "build-resources/electron/assets",
    "build-resources/canva-linux-assets/desktop",
    "build-resources/canva-linux-assets/metainfo",
    "build-resources/canva-linux-assets/icons",
  ] as const) {
    assert.equal(exists(relativePath), true, `${relativePath} must exist`);
  }
});
