import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || process.cwd();

test("preload bundles keep .mjs extension", () => {
  const buildPreloadPath = path.join(repoRoot, "build-resources", "c420ui", "scripts", "build-preload-bundle.ts");
  const content = fs.readFileSync(buildPreloadPath, "utf8");

  assert.match(content, /canva\.bundle\.mjs/);
  assert.doesNotMatch(content, /buildPreloadBundle\("toolbar"/);
  assert.ok(!content.includes(".bundle.cjs"), "build-preload-bundle.ts should not use .cjs extension");
});

test("preload build keeps format esm", () => {
  const buildPreloadPath = path.join(repoRoot, "build-resources", "c420ui", "scripts", "build-preload-bundle.ts");
  const content = fs.readFileSync(buildPreloadPath, "utf8");

  assert.match(content, /format: "esm"/);
  assert.ok(!content.includes('format: "cjs"'), "build-preload-bundle.ts should not switch to CommonJS format");
});

test("runtime does not reference toolbar.bundle.mjs path", () => {
  const mainPath = path.join(repoRoot, "build-resources", "electron", "main", "index.ts");
  const content = fs.readFileSync(mainPath, "utf8");

  assert.doesNotMatch(content, /toolbar\.bundle\.mjs/);
  assert.ok(!content.includes("toolbar.bundle.cjs"), "index.ts should not use .cjs for toolbar preload");
});

test("runtime keeps canva.bundle.mjs path", () => {
  const controllerPath = path.join(repoRoot, "build-resources", "electron", "main", "tab-controller.ts");
  const content = fs.readFileSync(controllerPath, "utf8");

  assert.match(content, /canva\.bundle\.mjs/);
  assert.ok(!content.includes("canva.bundle.cjs"), "tab-controller.ts should not use .cjs for canva preload");
});

test("generated canva preload bundle does not contain import from electron", () => {
  const bundles = [
    path.join(repoRoot, ".build", "electron", "preload", "canva.bundle.mjs"),
  ];

  for (const bundle of bundles) {
    if (!fs.existsSync(bundle)) continue;
    const content = fs.readFileSync(bundle, "utf8");
    assert.ok(!/import\s+.*from\s+["']electron["']/.test(content), `${path.basename(bundle)} should not contain external electron import`);
    assert.ok(!/(^|[^.\w$])require\(["']electron["']\)/m.test(content), `${path.basename(bundle)} should not contain CommonJS electron require wrappers`);
    assert.ok(!content.includes("ex" + "ports" + "." + "__esModule"), `${path.basename(bundle)} should not contain CommonJS exports marker`);
    assert.ok(!content.includes("mod" + "ule" + "." + "exports"), `${path.basename(bundle)} should not contain CommonJS module exports`);
  }
});

test("preload source does not use static runtime electron imports", () => {
  const preloadDir = path.join(repoRoot, "build-resources", "electron", "preload");
  const sources = fs.readdirSync(preloadDir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => path.join(preloadDir, name));

  for (const source of sources) {
    const content = fs.readFileSync(source, "utf8");
    assert.doesNotMatch(content, /^\s*import\s+(?!type\b).*["']electron["'];?/m, `${path.basename(source)} must not import electron at runtime`);
  }
});

test("electron-preload-api keeps sandbox preload require fallback after ESM import", () => {
  const preloadApiPath = path.join(repoRoot, "build-resources", "electron", "preload", "electron-preload-api.ts");
  const content = fs.readFileSync(preloadApiPath, "utf8");

  assert.match(content, /import\("electron"\)/);
  assert.match(content, /electron\.default/);
  assert.match(content, /globalThis[\s\S]*require/);
  assert.match(content, /eval\)\("require"\)|eval\(["']require["']\)/);
  assert.match(content, /preloadRequire\("electron"\)/);
});

test("generated canva preload bundle keeps sandbox preload require fallback", () => {
  const bundles = [
    path.join(repoRoot, ".build", "electron", "preload", "canva.bundle.mjs"),
  ];

  for (const bundle of bundles) {
    if (!fs.existsSync(bundle)) continue;
    const content = fs.readFileSync(bundle, "utf8");
    assert.match(content, /import\("electron"\)/, `${path.basename(bundle)} should attempt ESM electron import`);
    assert.match(content, /preloadRequire\("electron"\)/, `${path.basename(bundle)} should resolve electron through preload global require when ESM import is unavailable`);
    assert.match(content, /globalThis\.require/, `${path.basename(bundle)} should read Electron preload global require`);
    assert.ok(!content.includes("electron_default = (init_electron(), __toCommonJS(electron_exports))"), `${path.basename(bundle)} should not resolve electron shim to itself`);
  }
});

test("generated toolbar preload is not emitted", () => {
  const bundle = path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs");
  assert.equal(fs.existsSync(bundle), false);
});

test("build-preload-bundle does not include toolbar preload entry", () => {
  const buildPreloadPath = path.join(repoRoot, "build-resources", "c420ui", "scripts", "build-preload-bundle.ts");
  const content = fs.readFileSync(buildPreloadPath, "utf8");

  assert.doesNotMatch(content, /buildPreloadBundle\("toolbar"/);
  assert.match(content, /removeStaleToolbarPreloadBundle/);
});
