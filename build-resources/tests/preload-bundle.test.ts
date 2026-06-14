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
  assert.match(content, /globalThis[\s\S]*require/);
  assert.match(content, /eval\)\("require"\)|eval\(["']require["']\)/);
  assert.match(content, /preloadRequire\("electron"\)/);
});

test("generated preload bundles keep sandbox preload require fallback", () => {
  const bundles = [
    path.join(repoRoot, ".build", "electron", "preload", "canva.bundle.mjs"),
    path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs"),
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

test("toolbar preload dispatches canva-tabs-bridge-ready", () => {
  const toolbarPreloadPath = path.join(repoRoot, "build-resources", "electron", "preload", "toolbar.ts");
  const content = fs.readFileSync(toolbarPreloadPath, "utf8");

  assert.match(content, /dispatchEvent\(new CustomEvent\("canva-tabs-bridge-ready"\)\)/);
});

test("toolbar preload exposes only explicit bridge methods", () => {
  const toolbarPreloadPath = path.join(repoRoot, "build-resources", "electron", "preload", "toolbar.ts");
  const content = fs.readFileSync(toolbarPreloadPath, "utf8");

  for (const method of ["subscribeTabsState", "switchTab", "closeTab", "goHome", "getSystemTheme"]) {
    assert.match(content, new RegExp(`\\b${method}\\b`));
  }
  assert.doesNotMatch(content, /(?:^|\n)\s*send\s*\(/);
  assert.doesNotMatch(content, /\bonState\(/);
});

test("generated toolbar preload exposes canvaTabs bridge", () => {
  const bundle = path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs");
  if (!fs.existsSync(bundle)) return;

  const content = fs.readFileSync(bundle, "utf8");
  assert.match(content, /\.exposeInMainWorld\("canvaTabs"/);
  for (const method of ["subscribeTabsState", "switchTab", "closeTab", "goHome", "getSystemTheme"]) {
    assert.match(content, new RegExp(`\\b${method}\\b`));
  }
});

test("generated toolbar preload contains subscribeTabsState/switchTab/closeTab/goHome", () => {
  const bundle = path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs");
  if (!fs.existsSync(bundle)) return;

  const content = fs.readFileSync(bundle, "utf8");
  for (const method of ["subscribeTabsState", "switchTab", "closeTab", "goHome"]) {
    assert.match(content, new RegExp(`\\b${method}\\b`));
  }
  assert.doesNotMatch(content, /\bonState\b/);
});

test("generated toolbar preload does not read process argv before exposing canvaTabs", () => {
  const bundle = path.join(repoRoot, ".build", "electron", "preload", "toolbar.bundle.mjs");
  if (!fs.existsSync(bundle)) return;

  const content = fs.readFileSync(bundle, "utf8");
  assert.doesNotMatch(content, /process\.argv/);
  assert.match(content, /getPreloadArgv\(\)\.find/);
});
