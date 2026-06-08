import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || process.cwd();

test("preload bundles keep .mjs extension", () => {
  const buildPreloadPath = path.join(repoRoot, "build-resources", "c420ui", "scripts", "build-preload-bundle.ts");
  const content = fs.readFileSync(buildPreloadPath, "utf8");

  assert.match(content, /canva\.bundle\.mjs/);
  assert.match(content, /toolbar\.bundle\.mjs/);
  assert.ok(!content.includes(".bundle.cjs"), "build-preload-bundle.ts should not use .cjs extension");
});

test("preload build keeps format esm", () => {
  const buildPreloadPath = path.join(repoRoot, "build-resources", "c420ui", "scripts", "build-preload-bundle.ts");
  const content = fs.readFileSync(buildPreloadPath, "utf8");

  assert.match(content, /format: "esm"/);
  assert.ok(!content.includes('format: "cjs"'), "build-preload-bundle.ts should not switch to CommonJS format");
});

test("runtime keeps toolbar.bundle.mjs path", () => {
  const mainPath = path.join(repoRoot, "build-resources", "electron", "main", "index.ts");
  const content = fs.readFileSync(mainPath, "utf8");

  assert.match(content, /toolbar\.bundle\.mjs/);
  assert.ok(!content.includes("toolbar.bundle.cjs"), "index.ts should not use .cjs for toolbar preload");
});

test("runtime keeps canva.bundle.mjs path", () => {
  const controllerPath = path.join(repoRoot, "build-resources", "electron", "main", "tab-controller.ts");
  const content = fs.readFileSync(controllerPath, "utf8");

  assert.match(content, /canva\.bundle\.mjs/);
  assert.ok(!content.includes("canva.bundle.cjs"), "tab-controller.ts should not use .cjs for canva preload");
});

test("generated preload bundles do not contain import from electron", () => {
  const bundles = [
    path.join(repoRoot, ".build", "electron", "preload", "canva.bundle.mjs"),
    path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs"),
  ];

  for (const bundle of bundles) {
    if (!fs.existsSync(bundle)) continue;
    const content = fs.readFileSync(bundle, "utf8");
    assert.ok(!/import\s+.*from\s+["']electron["']/.test(content), `${path.basename(bundle)} should not contain external electron import`);
  }
});

test("generated preload bundles keep electron shim bound to runtime require", () => {
  const bundles = [
    path.join(repoRoot, ".build", "electron", "preload", "canva.bundle.mjs"),
    path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs"),
  ];

  for (const bundle of bundles) {
    if (!fs.existsSync(bundle)) continue;
    const content = fs.readFileSync(bundle, "utf8");
    assert.match(content, /\(0,\s*eval\)\("require"\)\("electron"\)/, `${path.basename(bundle)} should resolve electron through runtime require`);
    assert.ok(!content.includes("electron_default = (init_electron(), __toCommonJS(electron_exports))"), `${path.basename(bundle)} should not resolve electron shim to itself`);
  }
});

test("generated toolbar preload exposes canvaTabs bridge", () => {
  const bundle = path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs");
  if (!fs.existsSync(bundle)) return;

  const content = fs.readFileSync(bundle, "utf8");
  assert.match(content, /\.exposeInMainWorld\("canvaTabs"/);
  for (const method of ["subscribeTabsState", "switchTab", "closeTab", "goHome"]) {
    assert.match(content, new RegExp(`\\b${method}\\b`));
  }
});
