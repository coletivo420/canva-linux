import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

test("root legacy layout directories do not exist", () => {
  for (const relativePath of [
    "packages",
    "electron",
    "data",
    "assets/screenshots",
    "config/canva-linux",
    "packaging/flathub",
    "test",
    "types",
  ] as const) {
    assert.equal(exists(relativePath), false, `${relativePath} must not exist at the repository root`);
  }
});

test("electron runtime and packaging assets live in the canonical build-resources layout", () => {
  for (const relativePath of [
    "build-resources/c420ui",
    "build-resources/c420ui/src",
    "build-resources/c420ui/scripts",
    "build-resources/c420ui/checks",
    "build-resources/c420ui/test",
    "build-resources/c420ui/bootstrap",
    "build-resources/c420ui/bootstrap/generated",
    "build-resources/electron/main",
    "build-resources/electron/preload",
    "build-resources/electron/shared",
    "build-resources/electron/ui",
    "build-resources/electron/assets",
    "build-resources/canva-linux-assets/desktop",
    "build-resources/canva-linux-assets/metainfo",
    "build-resources/canva-linux-assets/icons",
    "build-resources/canva-linux-assets/icons/hicolor",
    "build-resources/canva-linux/screenshots",
    "build-resources/canva-linux/config",
    "build-resources/canva-linux/packaging/flathub",
    "build-resources/tests",
    "build-resources/c420ui/types",
    "build-resources/config/typescript/tsconfig.json",
    "build-resources/config/typescript/tsconfig.build.json",
    "build-resources/config/typescript/tsconfig.strict.json",
    "build-resources/config/eslint/eslint.config.ts",
    "build-resources/config/playwright/playwright.config.ts",
  ] as const) {
    assert.equal(exists(relativePath), true, `${relativePath} must exist`);
  }
});

test("root does not contain loose .ts files and only keeps package json files", () => {
  const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".ts")) {
      assert.fail(`${entry.name} must not exist at repository root`);
    }
    if (entry.name.endsWith(".json")) {
      assert.equal(
        ["package.json", "package-lock.json"].includes(entry.name),
        true,
        `${entry.name} is not an allowed root JSON file`,
      );
    }
  }
});
