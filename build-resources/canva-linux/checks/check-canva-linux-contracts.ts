#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  calculateCanvaLinuxSourceHash,
  combineSourceHashes,
} from "../source-hash.js";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../project-root.js";
import { calculateC420UISourceHash } from "../../c420ui/bootstrap/source-hash.js";

type PackageJson = {
  scripts?: Record<string, string>;
  build?: {
    directories?: {
      buildResources?: string;
    };
    linux?: {
      appId?: string;
      icon?: string;
    };
  };
};

function readText(rootDir: string, relativePath: string): string | null {
  try {
    return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch {
    return null;
  }
}

function readJson<T>(rootDir: string, relativePath: string): T | null {
  const text = readText(rootDir, relativePath);
  if (text === null) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function collectFiles(rootDir: string, relativeDir: string): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const stats = fs.statSync(absoluteDir);
  if (!stats.isDirectory()) return [];

  const files: string[] = [];
  const visit = (relativePath: string): void => {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) return;
    const entryStats = fs.statSync(absolutePath);
    if (entryStats.isFile()) {
      files.push(relativePath.split(path.sep).join(path.posix.sep));
      return;
    }

    if (!entryStats.isDirectory()) return;
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      visit(path.join(relativePath, entry.name));
    }
  };

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    visit(path.join(relativeDir, entry.name));
  }

  return files;
}

const C420UI_OWNERSHIP_GUARDRAILS = [
  "c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under `build-resources/c420ui`.",
  "Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by `build-resources/c420ui/checks`.",
  "No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.",
  "Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under `build-resources/canva-linux/checks`",
  "exclude c420ui-owned roots except via the combined hash.",
] as const;

function reportMissingFragments(
  failures: string[],
  relativePath: string,
  contents: string,
  fragments: readonly string[],
  label: string,
): void {
  for (const fragment of fragments) {
    if (!contents.includes(fragment)) {
      failures.push(`${relativePath}: missing ${label}: ${fragment}`);
    }
  }
}

function checkForbiddenPaths(rootDir: string, failures: string[]): void {
  const legacyForbiddenPaths = [
    "packages",
    "packages/c420ui",
    "packages/electron",
    "packages/canva-linux-assets",
    "electron",
    "data",
    "scripts/build-c420ui-bootstrap.ts",
    "scripts/run-c420ui.ts",
    "scripts/run-c420ui-cli.ts",
    "scripts/c420ui-builder.ts",
    "scripts/build-appimage.sh",
    "scripts/build-flatpak-bundle.sh",
    "scripts/install-native.sh",
    "build-resources/canva-linux/packaging/flathub/scripts/generate-npm-sources.ts",
    "build-resources/canva-linux/packaging/flathub/scripts/generate-npm-sources.sh",
    "build-resources/canva-linux/checks/check-c420ui-bootstrap.ts",
    "build-resources/canva-linux/checks/check-c420ui-artifact-gate.ts",
    "build-resources/canva-linux/checks/check-c420ui-node-check.ts",
    "build-resources/canva-linux/checks/c420ui-bootstrap-check-helpers.ts",
    "bootstrap/c420ui",
  ] as const;

  for (const relativePath of legacyForbiddenPaths) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must not exist`);
    }
  }
}

function checkRequiredPaths(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "build-resources/c420ui",
    "build-resources/electron",
    "build-resources/electron/preload/electron-preload-api.ts",
    "build-resources/canva-linux/assets",
    "build-resources/c420ui/scripts/build-bootstrap.ts",
    "build-resources/c420ui/scripts/c420ui-builder.ts",
    "build-resources/c420ui/scripts/run-c420ui.ts",
    "build-resources/c420ui/scripts/run-c420ui-cli.ts",
    "build-resources/c420ui/scripts/install-native.ts",
    "build-resources/c420ui/scripts/build-appimage.ts",
    "build-resources/c420ui/scripts/build-flatpak-bundle.ts",
    "build-resources/c420ui/operations/detection/install-detection.ts",
    "build-resources/c420ui/operations/packaging/appimage.ts",
    "build-resources/c420ui/operations/packaging/flatpak-bundle.ts",
    "build-resources/c420ui/operations/install/native.ts",
    "build-resources/c420ui/checks/check-bootstrap.ts",
    "build-resources/c420ui/checks/check-artifact-gate.ts",
    "build-resources/c420ui/checks/check-node.ts",
    "build-resources/c420ui/checks/bootstrap-check-helpers.ts",
    "build-resources/c420ui/checks/check-c420ui-core-contracts.ts",
    "build-resources/c420ui/test/artifact-fragments.test.ts",
    "build-resources/c420ui/test/bootstrap-artifact-hashes.test.ts",
    "build-resources/c420ui/test/bootstrap-artifacts.test.ts",
    "build-resources/c420ui/test/bootstrap-bundle.test.ts",
    "build-resources/c420ui/test/bootstrap-check-helpers.test.ts",
    "build-resources/c420ui/test/bootstrap-source-hash.test.ts",
    "build-resources/c420ui/test/bootstrap-syntax-gate.test.ts",
    "build-resources/c420ui/test/detected-installations-summary.test.ts",
    "build-resources/c420ui/test/keybindings.test.ts",
    "build-resources/c420ui/test/terminal-layout.test.ts",
    "build-resources/canva-linux/assets/desktop/io.github.coletivo420.canva-linux.desktop",
    "build-resources/canva-linux/assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    "build-resources/canva-linux/assets/icons",
    "build-resources/canva-linux/assets/icons/io.github.coletivo420.canva-linux.png",
    "build-resources/c420ui/bootstrap/generated/manifest.json",
    "build-resources/c420ui/bootstrap/generated/run-c420ui.mjs",
    "build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs",
    "build-resources/c420ui/bootstrap/generated/c420ui-builder.mjs",
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must exist`);
    }
  }
}

function checkPackageScripts(rootDir: string, failures: string[]): void {
  const packageJson = readJson<PackageJson>(rootDir, "package.json");
  if (!packageJson) {
    failures.push("package.json: must be readable");
    return;
  }

  const scripts = packageJson.scripts || {};
  const requiredScripts: Record<string, string> = {
    "build:metadata": "npm run run:ts -- build-resources/c420ui/scripts/generate-build-metadata.ts --committed",
    "build:metadata:effective": "npm run run:ts -- build-resources/c420ui/scripts/generate-build-metadata.ts --effective",
    "build:c420ui-bootstrap": "npm run build:metadata && esbuild build-resources/c420ui/scripts/build-bootstrap.ts --bundle --platform=node --target=node22 --format=esm --external:esbuild --outfile=.build/build-resources/c420ui/scripts/build-bootstrap.mjs && node .build/build-resources/c420ui/scripts/build-bootstrap.mjs",
    "check:c420ui-node-check": "npm run build:c420ui-checks && node .build/build-resources/c420ui/checks/check-node.mjs",
    "check:c420ui-bootstrap": "npm run build:c420ui-checks && node .build/build-resources/c420ui/checks/check-bootstrap.mjs",
    "check:c420ui-bootstrap-artifacts": "npm run build:c420ui-checks && node .build/build-resources/c420ui/checks/check-artifact-gate.mjs",
    "test:c420ui": "npm run test -- build-resources/c420ui/test",
    "c420ui": "CANVA_SCRIPT_REPO_ROOT=$PWD npm run build:scripts && CANVA_SCRIPT_REPO_ROOT=$PWD node .build/scripts/run-c420ui.mjs",
    "c420ui:cli": "CANVA_SCRIPT_REPO_ROOT=$PWD npm run build:scripts && CANVA_SCRIPT_REPO_ROOT=$PWD node .build/scripts/run-c420ui-cli.mjs",
  };

  for (const [name, expected] of Object.entries(requiredScripts)) {
    if (scripts[name] !== expected) {
      failures.push(`package.json: script ${name} must be ${expected}`);
    }
  }

  for (const duplicateAlias of [
    "c420ui:install-native",
    "c420ui:build-appimage",
    "c420ui:build-flatpak-bundle",
  ] as const) {
    if (duplicateAlias in scripts) {
      failures.push(`package.json: script ${duplicateAlias} must not exist; use the canonical public package/install script`);
    }
  }

  const buildResources = packageJson.build?.directories?.buildResources;
  if (buildResources !== "build-resources/canva-linux/assets") {
    failures.push("package.json: build.directories.buildResources must be build-resources/canva-linux/assets");
  }

  const appId = packageJson.build?.linux?.appId;
  if (appId !== "io.github.coletivo420.canva-linux") {
    failures.push("package.json: build.linux.appId must be io.github.coletivo420.canva-linux");
  }

  const icon = packageJson.build?.linux?.icon;
  if (icon !== "icons/io.github.coletivo420.canva-linux") {
    failures.push("package.json: build.linux.icon must be icons/io.github.coletivo420.canva-linux");
  }

  const buildScripts = scripts["build:scripts"];
  if (typeof buildScripts !== "string") {
    failures.push("package.json: build:scripts must exist");
    return;
  }

  for (const requiredFragment of [
    "build-resources/c420ui/scripts/run-c420ui.ts",
    "build-resources/c420ui/scripts/run-c420ui-cli.ts",
    "build-resources/c420ui/scripts/c420ui-builder.ts",
    "build-resources/c420ui/bootstrap/build-recipe.ts",
    "build-resources/c420ui/bootstrap/source-hash.ts",
    "build-resources/c420ui/checks/check-bootstrap.ts",
  ] as const) {
    if (!buildScripts.includes(requiredFragment)) {
      failures.push(`package.json: build:scripts must include ${requiredFragment}`);
    }
  }

  for (const forbiddenPattern of [
    /(?:^|\s)scripts\/run-c420ui\.ts(?:\s|$)/,
    /(?:^|\s)scripts\/run-c420ui-cli\.ts(?:\s|$)/,
    /(?:^|\s)scripts\/c420ui-builder\.ts(?:\s|$)/,
    /(?:^|\s)scripts\/build-c420ui-bootstrap\.ts(?:\s|$)/,
    /(?:^|\s)scripts\/checks\/canva-linux\/check-c420ui-/,
    /(?:^|\s)test\/c420ui-/,
    /bootstrap\/c420ui\//,
  ] as const) {
    if (forbiddenPattern.test(buildScripts)) {
      failures.push(`package.json: build:scripts must not include ${forbiddenPattern}`);
    }
  }
}

function checkBuildMetadataContracts(rootDir: string, failures: string[]): void {
  const loaderSource = readText(rootDir, "build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts");
  if (!loaderSource) {
    failures.push("build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts: must exist");
  } else {
    if (!loaderSource.includes("Missing Canva Linux build metadata. Run npm run build:metadata.")) {
      failures.push("build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts: must fail clearly when metadata is missing");
    }
    if (!loaderSource.includes("allowFallback") || !loaderSource.includes("options.allowFallback")) {
      failures.push("build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts: neutral fallback must require explicit opt-in");
    }
  }

  const committed = readJson<{
    buildRevision?: string;
    version?: string;
    displayVersion?: string;
    phase?: string;
    fullVersion?: string;
    canvaLinuxSourceHash?: string;
    c420uiSourceHash?: string;
    combinedSourceHash?: string;
  }>(rootDir, "build-resources/canva-linux/config/build-metadata.json");
  if (!committed) {
    failures.push("build-resources/canva-linux/config/build-metadata.json: must be readable");
    return;
  }

  if (committed.buildRevision !== "unknown") {
    failures.push("build-resources/canva-linux/config/build-metadata.json: buildRevision must be unknown");
  }

  for (const field of ["canvaLinuxSourceHash", "c420uiSourceHash", "combinedSourceHash"] as const) {
    if (typeof committed[field] !== "string" || !committed[field]?.startsWith("sha256:")) {
      failures.push(`build-resources/canva-linux/config/build-metadata.json: must include ${field} as sha256 hash`);
    }
  }
  if (typeof committed.canvaLinuxSourceHash === "string" && typeof committed.c420uiSourceHash === "string") {
    const expectedCanvaLinuxSourceHash = calculateCanvaLinuxSourceHash(rootDir);
    const expectedC420UISourceHash = calculateC420UISourceHash(rootDir);
    const expectedCombinedSourceHash = combineSourceHashes(
      expectedCanvaLinuxSourceHash,
      expectedC420UISourceHash,
    );

    if (committed.canvaLinuxSourceHash !== expectedCanvaLinuxSourceHash) {
      failures.push("build-resources/canva-linux/config/build-metadata.json: canvaLinuxSourceHash is stale; run npm run build:metadata");
    }
    if (committed.c420uiSourceHash !== expectedC420UISourceHash) {
      failures.push("build-resources/canva-linux/config/build-metadata.json: c420uiSourceHash is stale; run npm run build:metadata");
    }
    if (committed.combinedSourceHash !== expectedCombinedSourceHash) {
      failures.push("build-resources/canva-linux/config/build-metadata.json: combinedSourceHash is stale; run npm run build:metadata");
    }
  }

  for (const field of ["version", "displayVersion", "phase", "fullVersion"] as const) {
    if (typeof committed[field] === "string" && /\+g[0-9a-f]{7}$/i.test(committed[field] || "")) {
      failures.push(`build-resources/canva-linux/config/build-metadata.json: ${field} must not include +g hash`);
    }
  }

  let trackedEffective = "";
  try {
    trackedEffective = execFileSync(
      "git",
      ["ls-files", "--", ".build/canva-linux/build-metadata.effective.json"],
      { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    trackedEffective = "";
  }
  if (trackedEffective) {
    failures.push(".build/canva-linux/build-metadata.effective.json: must not be committed");
  }

  try {
    const ignored = execFileSync(
      "git",
      ["check-ignore", ".build/canva-linux/build-metadata.effective.json"],
      { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    if (ignored !== ".build/canva-linux/build-metadata.effective.json") {
      failures.push(".build/canva-linux/build-metadata.effective.json: must be gitignored");
    }
  } catch {
    failures.push(".build/canva-linux/build-metadata.effective.json: must be gitignored");
  }
}

function checkRuntimeAssetsMetadataCopyContract(rootDir: string, failures: string[]): void {
  const source = readText(rootDir, "build-resources/c420ui/scripts/copy-runtime-assets.ts");
  if (!source) {
    failures.push("build-resources/c420ui/scripts/copy-runtime-assets.ts: must exist");
    return;
  }

  const metadataTargetLiteral =
    ".build/electron/config/canva-linux/build-metadata.json";
  const targetMatches =
    source.match(new RegExp(metadataTargetLiteral.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))
      ?.length ?? 0;
  if (targetMatches !== 1) {
    failures.push("build-resources/c420ui/scripts/copy-runtime-assets.ts: metadata copy target must be defined exactly once");
  }

  if (!source.includes("metadataSourcePath")) {
    failures.push("build-resources/c420ui/scripts/copy-runtime-assets.ts: must resolve metadataSourcePath once");
  }

  if (
    source.includes(
      'to === ".build/electron/config/canva-linux/build-metadata.json" && fs.existsSync(target)',
    )
  ) {
    failures.push("build-resources/c420ui/scripts/copy-runtime-assets.ts: must not skip metadata copy when target exists");
  }

  const buildMetadataSource = readText(rootDir, "build-resources/electron/main/build-metadata.ts");
  if (!buildMetadataSource) {
    failures.push("build-resources/electron/main/build-metadata.ts: must exist");
    return;
  }

  const effectiveIndex = buildMetadataSource.indexOf(
    'path.join(cwd, ".build", "canva-linux", "build-metadata.effective.json")',
  );
  const committedIndex = buildMetadataSource.indexOf(
    'path.join(cwd, "build-resources", "canva-linux", "config", "build-metadata.json")',
  );
  if (effectiveIndex === -1 || committedIndex === -1 || effectiveIndex > committedIndex) {
    failures.push("build-resources/electron/main/build-metadata.ts: runtime must prefer effective metadata before committed fallback");
  }
}

function checkSourceHashContracts(rootDir: string, failures: string[]): void {
  const c420uiSourceHashSource = readText(rootDir, "build-resources/c420ui/bootstrap/source-hash.ts");
  if (!c420uiSourceHashSource) {
    failures.push("build-resources/c420ui/bootstrap/source-hash.ts: must exist");
  } else {
    for (const forbiddenInput of [
      "\"scripts/canva-linux\"",
      "\"build-resources/electron\"",
      "\"docs\"",
      "\"build-resources/tests\"",
    ] as const) {
      if (c420uiSourceHashSource.includes(forbiddenInput)) {
        failures.push(`build-resources/c420ui/bootstrap/source-hash.ts: c420ui source hash inputs must not include ${forbiddenInput}`);
      }
    }
  }

  const canvaLinuxSourceHashSource = readText(rootDir, "build-resources/canva-linux/source-hash.ts");
  if (!canvaLinuxSourceHashSource) {
    failures.push("build-resources/canva-linux/source-hash.ts: must exist");
    return;
  }

  if (!canvaLinuxSourceHashSource.includes("\"build-resources/c420ui\"")) {
    failures.push("build-resources/canva-linux/source-hash.ts: must exclude build-resources/c420ui from Canva Linux hash inputs");
  }
  for (const forbiddenInput of [
    "\"docs\"",
    "\"build-resources/tests\"",
  ] as const) {
    if (!canvaLinuxSourceHashSource.includes(forbiddenInput)) {
      failures.push(`build-resources/canva-linux/source-hash.ts: must explicitly handle ${forbiddenInput} in source hash boundary rules`);
    }
  }
}

function checkBuildResourcesLayoutContract(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "build-resources/c420ui/src",
    "build-resources/c420ui/scripts",
    "build-resources/c420ui/checks",
    "build-resources/c420ui/test",
    "build-resources/c420ui/bootstrap/generated",
    "build-resources/electron/main",
    "build-resources/electron/preload",
    "build-resources/electron/shared",
    "build-resources/electron/ui",
    "build-resources/electron/assets",
    "build-resources/canva-linux/assets/desktop",
    "build-resources/canva-linux/assets/metainfo",
    "build-resources/canva-linux/assets/icons",
    "build-resources/canva-linux/packaging/flathub/tools/generate-npm-sources.ts",
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: required build-resources layout path must exist`);
    }
  }

  for (const forbiddenPath of [
    "build-resources/icon.png",
    "data/icons",
    "data/io.github.coletivo420.canva-linux.desktop",
    "data/io.github.coletivo420.canva-linux.metainfo.xml",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
      failures.push(`${forbiddenPath}: legacy path must not be restored`);
    }
  }
}

function checkRootLayoutMinimizationContract(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "build-resources/canva-linux/assets/screenshots",
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
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: consolidated layout path must exist`);
    }
  }

  for (const relativePath of [
    "assets/screenshots",
    "config/canva-linux",
    "packaging/flathub",
    "test",
    "types",
    "tsconfig.build.json",
    "tsconfig.strict.json",
    "eslint.config.ts",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: legacy root layout path must not be restored`);
    }
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    if (entry.name.endsWith(".json")) {
      if (!["package.json", "package-lock.json"].includes(entry.name)) {
        failures.push(`${entry.name}: root JSON files are forbidden by consolidation policy`);
      }
    }

    if (entry.name.endsWith(".ts")) {
      failures.push(`${entry.name}: root TypeScript files are forbidden by consolidation policy`);
    }
  }
}

function checkRootTests(rootDir: string, failures: string[]): void {
  const allowedRootC420UITests = new Set([
    "build-resources/tests/c420ui-auto-bootstrap.test.ts",
  ]);

  for (const relativePath of collectFiles(rootDir, "build-resources/tests")) {
    const fileName = path.basename(relativePath);
    if (allowedRootC420UITests.has(relativePath)) continue;
    if (/^c420ui-.*\.test\.(?:ts|js|tsx|jsx)$/.test(fileName)) {
      failures.push(`${relativePath}: root c420ui tests must not exist`);
    }
  }
}

function checkProjectLayoutOwnership(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "packages",
    "electron",
    "data",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must not exist`);
    }
  }

  for (const relativePath of [
    "build-resources/c420ui",
    "build-resources/electron",
    "build-resources/canva-linux/assets",
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must exist`);
    }
  }

  for (const relativePath of collectFiles(rootDir, "build-resources/canva-linux/assets/icons")) {
    const basename = path.basename(relativePath);
    if (["icon.png", "app.png", "logo.png", "canva-linux.png"].includes(basename)) {
      failures.push(`${relativePath}: must not use generic icon basename ${basename}`);
    }
  }
}

function checkAdapterBoundary(rootDir: string, failures: string[]): void {
  const adapterFiles = collectFiles(rootDir, "build-resources/canva-linux/c420ui-adapter");
  for (const relativePath of adapterFiles) {
    const contents = readText(rootDir, relativePath);
    if (!contents) continue;
    for (const forbiddenFragment of [
      "build-resources/c420ui/checks/",
      "build-resources/c420ui/bootstrap/",
      "bootstrap-check-helpers",
      "check-bootstrap",
      "check-artifact-gate",
      "check-node",
    ] as const) {
      if (contents.includes(forbiddenFragment)) {
        failures.push(`${relativePath}: must not own c420ui checks/bootstrap responsibilities`);
      }
    }
  }

  const adapterSource = readText(rootDir, "build-resources/canva-linux/c420ui-adapter/adapter.ts");
  if (!adapterSource) {
    failures.push("build-resources/canva-linux/c420ui-adapter/adapter.ts: must exist");
    return;
  }
  for (const forbiddenFragment of [
    "appIdentityPath",
    "loadAppIdentity",
    "readAppIdentity",
    "getProjectPhase",
    "CANVA_PROJECT_PHASE",
  ] as const) {
    if (adapterSource.includes(forbiddenFragment)) {
      failures.push(`build-resources/canva-linux/c420ui-adapter/adapter.ts: must not keep redundant app identity/project phase fallback ${forbiddenFragment}`);
    }
  }
  if (!adapterSource.includes("const buildMetadata = loadBuildMetadata()") || !adapterSource.includes("const projectUi = loadProjectUi()")) {
    failures.push("build-resources/canva-linux/c420ui-adapter/adapter.ts: project phase must resolve from build metadata/project-ui directly");
  }
}

function checkDocs(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "CHANGELOG.md",
    "REVIEW.md",
    "docs/VALIDATION.md",
    "docs/internal/AI_GUARDRAILS.md",
  ] as const) {
    const contents = readText(rootDir, relativePath);
    if (!contents) {
      failures.push(`${relativePath}: must exist`);
      continue;
    }

    reportMissingFragments(failures, relativePath, contents, C420UI_OWNERSHIP_GUARDRAILS, "ownership boundary guidance");
  }
}

function checkValidateProjectScript(rootDir: string, failures: string[]): void {
  const packageJson = readJson<{ scripts?: Record<string, string> }>(rootDir, "package.json");
  const command = packageJson?.scripts?.["validate:project"] ?? "";
  if (
    !command.includes("npm run build:scripts") ||
    !command.includes("node .build/scripts/validate-project.mjs")
  ) {
    failures.push("package.json scripts.validate:project: must execute the generated TypeScript entrypoint");
  }

  const projectEntrypointSource = readText(rootDir, "build-resources/canva-linux/scripts/validate-project.ts");
  if (!projectEntrypointSource || !projectEntrypointSource.includes("runProjectValidation")) {
    failures.push("build-resources/canva-linux/scripts/validate-project.ts: must dispatch to runProjectValidation");
  }

  const projectValidationSource = readText(rootDir, "build-resources/canva-linux/validation/project.ts");
  if (!projectValidationSource) {
    failures.push("build-resources/canva-linux/validation/project.ts: must exist");
    return;
  }

  for (const requiredStep of [
    "npm run build:metadata",
    "npm run lint",
    "npm run typecheck",
    "npm run typecheck:strict",
    "npm test",
    "npm run check:c420ui-node-check",
    "npm run check:c420ui-bootstrap-artifacts",
    "git diff --exit-code",
    "npm run docs:check-ai",
    "npm run check:c420ui-core",
    "npm run check:canva-linux",
    "npm run check:shared-tooling",
    "npm run build:runtime",
    "npm run build:check",
  ] as const) {
    if (!projectValidationSource.includes(requiredStep)) {
      failures.push(`build-resources/canva-linux/validation/project.ts: missing required step ${requiredStep}`);
    }
  }
}

function checkC420UIAutoBootstrapContract(rootDir: string, failures: string[]): void {
  const ensureBootstrapSource = readText(rootDir, "build-resources/c420ui/bootstrap/ensure-bootstrap.ts");
  if (!ensureBootstrapSource) {
    failures.push("build-resources/c420ui/bootstrap/ensure-bootstrap.ts: must exist");
    return;
  }

  for (const requiredFragment of [
    "calculateC420UISourceHash",
    "C420UI_BOOTSTRAP_ARTIFACT_FILES",
    "spawn(\"npm\", [\"run\", \"build:c420ui-bootstrap\"]",
    "\"--check\"",
  ] as const) {
    if (!ensureBootstrapSource.includes(requiredFragment)) {
      failures.push(`build-resources/c420ui/bootstrap/ensure-bootstrap.ts: missing required fragment ${requiredFragment}`);
    }
  }

  const builderSource = readText(rootDir, "build-resources/c420ui/scripts/c420ui-builder.ts");
  if (!builderSource) {
    failures.push("build-resources/c420ui/scripts/c420ui-builder.ts: must exist");
    return;
  }

  if (!builderSource.includes("import { ensureC420UIBootstrap } from \"../bootstrap/ensure-bootstrap.js\";")) {
    failures.push("build-resources/c420ui/scripts/c420ui-builder.ts: must import ensureC420UIBootstrap");
  }

  const ensureIndex = builderSource.indexOf("ensureC420UIBootstrap(rootDir);");
  const entrypointIndex = builderSource.indexOf("selectEntrypoint(rootDir, kind)");
  if (ensureIndex === -1 || entrypointIndex === -1 || ensureIndex > entrypointIndex) {
    failures.push("build-resources/c420ui/scripts/c420ui-builder.ts: ensureC420UIBootstrap(rootDir) must execute before selectEntrypoint(rootDir, kind)");
  }

  for (const forbiddenFragment of [
    "Run npm run build:c420ui-bootstrap",
    "c420ui bootstrap bundle is missing",
  ] as const) {
    if (builderSource.includes(forbiddenFragment)) {
      failures.push(`build-resources/c420ui/scripts/c420ui-builder.ts: must not include ${forbiddenFragment}`);
    }
  }

  const buildBootstrapSource = readText(rootDir, "build-resources/c420ui/scripts/build-bootstrap.ts");
  if (!buildBootstrapSource) {
    failures.push("build-resources/c420ui/scripts/build-bootstrap.ts: must exist");
    return;
  }

  if (buildBootstrapSource.includes("ensure-bootstrap")) {
    failures.push("build-resources/c420ui/scripts/build-bootstrap.ts: must not import ensure-bootstrap");
  }
}

function checkPreloadBundleContract(rootDir: string, failures: string[]): void {
  const buildPreloadSource = readText(rootDir, "build-resources/c420ui/scripts/build-preload-bundle.ts");
  if (!buildPreloadSource) {
    failures.push("build-resources/c420ui/scripts/build-preload-bundle.ts: must exist");
  } else {
    if (buildPreloadSource.includes('format: "cjs"')) {
      failures.push("build-resources/c420ui/scripts/build-preload-bundle.ts: must not use format: \"cjs\" for Electron preloads");
    }
    if (!buildPreloadSource.includes('format: "esm"')) {
      failures.push("build-resources/c420ui/scripts/build-preload-bundle.ts: must use format: \"esm\" for Electron preloads");
    }
    if (buildPreloadSource.includes(".bundle.cjs")) {
      failures.push("build-resources/c420ui/scripts/build-preload-bundle.ts: must not use .cjs for preload bundles");
    }
    if (!buildPreloadSource.includes("canva.bundle.mjs") || !buildPreloadSource.includes("toolbar.bundle.mjs")) {
      failures.push("build-resources/c420ui/scripts/build-preload-bundle.ts: preload bundles must stay ESM .mjs outputs");
    }
    for (const requiredFragment of [
      "must not contain runtime electron imports",
      "exportsFragment",
      "moduleExportsFragment",
    ] as const) {
      if (!buildPreloadSource.includes(requiredFragment)) {
        failures.push(`build-resources/c420ui/scripts/build-preload-bundle.ts: missing preload bundle validation for ${requiredFragment}`);
      }
    }
  }

  const indexSource = readText(rootDir, "build-resources/electron/main/index.ts");
  if (indexSource?.includes("toolbar.bundle.cjs")) {
    failures.push("build-resources/electron/main/index.ts: must not use toolbar.bundle.cjs");
  }
  if (indexSource && !indexSource.includes("toolbar.bundle.mjs")) {
    failures.push("build-resources/electron/main/index.ts: must keep toolbar.bundle.mjs preload path");
  }

  const controllerSource = readText(rootDir, "build-resources/electron/main/tab-controller.ts");
  if (controllerSource?.includes("canva.bundle.cjs")) {
    failures.push("build-resources/electron/main/tab-controller.ts: must not use canva.bundle.cjs");
  }
  if (controllerSource && !controllerSource.includes("canva.bundle.mjs")) {
    failures.push("build-resources/electron/main/tab-controller.ts: must keep canva.bundle.mjs preload path");
  }
  if (controllerSource && !/contextIsolation:\s*true/.test(controllerSource)) {
    failures.push("build-resources/electron/main/tab-controller.ts: Canva tabs must keep contextIsolation: true");
  }

  const preloadApiSource = readText(rootDir, "build-resources/electron/preload/electron-preload-api.ts");
  if (!preloadApiSource) {
    failures.push("build-resources/electron/preload/electron-preload-api.ts: must exist");
  } else {
    if (!preloadApiSource.includes('import("electron")')) {
      failures.push("build-resources/electron/preload/electron-preload-api.ts: must load Electron through dynamic ESM import");
    }
    for (const requiredFragment of [
      "resolvePreloadRequire",
      "globalThis",
      'require?: (moduleName: "electron")',
      'eval)("require")',
      'preloadRequire("electron")',
    ] as const) {
      if (!preloadApiSource.includes(requiredFragment)) {
        failures.push(`build-resources/electron/preload/electron-preload-api.ts: must keep sandbox Electron preload fallback ${requiredFragment}`);
      }
    }
  }

  for (const relativePath of [
    "build-resources/electron/preload/toolbar.ts",
    "build-resources/electron/preload/debug.ts",
    "build-resources/electron/preload/canva.ts",
  ] as const) {
    const source = readText(rootDir, relativePath);
    if (!source) continue;
    if (/^\s*import\s+(?!type\b).*["']electron["'];?/m.test(source)) {
      failures.push(`${relativePath}: preload source must not use runtime imports from "electron"`);
    }
  }

  for (const relativePath of [
    ".build/electron/preload/canva.bundle.mjs",
    ".build/electron/preload/toolbar.bundle.mjs",
  ] as const) {
    const bundle = readText(rootDir, relativePath);
    if (!bundle) continue;
    if (/^\s*import\s+.*["']electron["'];?/m.test(bundle)) {
      failures.push(`${relativePath}: generated preload bundle must not contain import from "electron"`);
    }
    if (/(^|[^.\w$])require\(["']electron["']\)/m.test(bundle)) {
      failures.push(`${relativePath}: generated preload bundle must not contain CommonJS require("electron")`);
    }
  }
}

function checkToolbarUIContract(rootDir: string, failures: string[]): void {
  const toolbarHtml = readText(rootDir, "build-resources/electron/ui/toolbar.html");
  if (!toolbarHtml) {
    failures.push("build-resources/electron/ui/toolbar.html: must exist");
    return;
  }

  if (toolbarHtml.includes("class=\"brand\"") || toolbarHtml.includes(".brand")) {
    failures.push("build-resources/electron/ui/toolbar.html: must not render duplicate brand slot");
  }

  if (!toolbarHtml.includes("getPinnedHomeLabel")) {
    failures.push("build-resources/electron/ui/toolbar.html: must use getPinnedHomeLabel for home tab labeling");
  }
  if (!toolbarHtml.includes("canva-tabs-bridge-ready")) {
    failures.push("build-resources/electron/ui/toolbar.html: must wait for canva-tabs-bridge-ready");
  }
  if (!toolbarHtml.includes("setInterval(onReady, 25)")) {
    failures.push("build-resources/electron/ui/toolbar.html: must poll for canvaTabs bridge in case readiness event does not cross contexts");
  }
  if (!toolbarHtml.includes("bridge-initialization-failed") || !toolbarHtml.includes("document.body.dataset.bridge = 'failed'")) {
    failures.push("build-resources/electron/ui/toolbar.html: must expose bridge-initialization-failed on timeout");
  }
  for (const forbiddenFragment of [
    "window.__canvaToolbarRenderState",
    "__canvaToolbarRenderState",
    "canva-toolbar://",
    "canvaTabs.send",
    "canvaTabs.onState",
  ] as const) {
    if (toolbarHtml.includes(forbiddenFragment)) {
      failures.push(`build-resources/electron/ui/toolbar.html: must not keep legacy toolbar fallback ${forbiddenFragment}`);
    }
  }
  for (const bridgeMethod of ["switchTab", "closeTab", "goHome", "getSystemTheme"] as const) {
    if (!toolbarHtml.includes(`canvaTabs.${bridgeMethod}`)) {
      failures.push(`build-resources/electron/ui/toolbar.html: must use canvaTabs.${bridgeMethod}`);
    }
  }
  if (!toolbarHtml.includes("bridge.subscribeTabsState(render)")) {
    failures.push("build-resources/electron/ui/toolbar.html: must subscribe through the resolved canvaTabs bridge");
  }

  const toolbarPreload = readText(rootDir, "build-resources/electron/preload/toolbar.ts");
  if (!toolbarPreload) {
    failures.push("build-resources/electron/preload/toolbar.ts: must exist");
    return;
  }

  if (!toolbarPreload.includes('contextBridge.exposeInMainWorld("canvaTabs"')) {
    failures.push("build-resources/electron/preload/toolbar.ts: must expose window.canvaTabs");
  }
  for (const bridgeMethod of ["subscribeTabsState", "switchTab", "closeTab", "goHome", "getSystemTheme"] as const) {
    if (!toolbarPreload.includes(bridgeMethod)) {
      failures.push(`build-resources/electron/preload/toolbar.ts: canvaTabs must expose ${bridgeMethod}`);
    }
  }
  if (!toolbarPreload.includes('CustomEvent("canva-tabs-bridge-ready")')) {
    failures.push("build-resources/electron/preload/toolbar.ts: must dispatch canva-tabs-bridge-ready");
  }
  if (/(?:^|\n)\s*send\s*\(/.test(toolbarPreload)) {
    failures.push("build-resources/electron/preload/toolbar.ts: canvaTabs must not expose legacy alias send");
  }
  if (/(?:^|\n)\s*onState\s*\(/.test(toolbarPreload)) {
    failures.push("build-resources/electron/preload/toolbar.ts: canvaTabs must not expose legacy alias onState");
  }

  const indexSource = readText(rootDir, "build-resources/electron/main/index.ts");
  if (indexSource?.includes("__canvaToolbarRenderState")) {
    failures.push("build-resources/electron/main/index.ts: must not call executeJavaScript(__canvaToolbarRenderState)");
  }
  if (indexSource?.includes("executeJavaScript") && indexSource.includes("tabs-state")) {
    failures.push("build-resources/electron/main/index.ts: must not use executeJavaScript for toolbar render state");
  }

  const shellSource = readText(rootDir, "build-resources/electron/main/shell.ts");
  if (shellSource?.includes("canva-toolbar://")) {
    failures.push("build-resources/electron/main/shell.ts: must not intercept canva-toolbar://");
  }
  if (shellSource?.includes("handleToolbarAction")) {
    failures.push("build-resources/electron/main/shell.ts: createToolbarView must not accept handleToolbarAction");
  }
}

function checkTabSwitchingContract(rootDir: string, failures: string[]): void {
  const tabsSource = readText(rootDir, "build-resources/electron/main/tabs.ts");
  if (!tabsSource) {
    failures.push("build-resources/electron/main/tabs.ts: must exist");
    return;
  }

  if (tabsSource.includes("for (const entry of state.tabs.values())") && tabsSource.includes("setTabVisibility(entry, entry.id === id)")) {
    failures.push("build-resources/electron/main/tabs.ts: switchToTab must not sweep all tabs; use targeted detach instead");
  }
  if (!tabsSource.includes("detachActiveContentView();") || !tabsSource.includes("ensureTopLevelView(tab.view);")) {
    failures.push("build-resources/electron/main/tabs.ts: switchToTab must detach active content view before showing requested tab");
  }
  if (!tabsSource.includes("pinnedHomeTab") || !tabsSource.includes("orderedTabs.filter((tab) => !tab.isHome).map(toToolbarTabItem)")) {
    failures.push("build-resources/electron/main/tabs.ts: toolbarState must keep pinnedHomeTab separate from regular tabs");
  }
  if (!/if\s*\(\s*state\.activeTabId\s*===\s*id\s*\)\s*{[\s\S]*?return;/.test(tabsSource)) {
    failures.push("build-resources/electron/main/tabs.ts: switchToTab must keep active-tab early return");
  }
  if (!tabsSource.includes("if (!tab || tab.isHome) return")) {
    failures.push("build-resources/electron/main/tabs.ts: closeTab must never close home tab");
  }
}

function checkCLEyeDropperContracts(rootDir: string, failures: string[]): void {
  const indexPath = "build-resources/electron/preload/cl-eyedropper/index.ts";
  const implementationPath = "build-resources/electron/preload/cl-eyedropper/cl-eyedropper.ts";
  const customFlowPath = "build-resources/electron/preload/custom-eyedropper-flow.ts";
  const indexSource = readText(rootDir, indexPath);
  const implementationSource = readText(rootDir, implementationPath);
  const customFlowSource = readText(rootDir, customFlowPath);

  if (!indexSource) {
    failures.push(`${indexPath}: must exist`);
  } else {
    for (const exportedName of ["CLEyeDropper", "installClEyeDropperScalingPatch", "removeClEyeDropperUi"] as const) {
      if (!indexSource.includes(exportedName)) {
        failures.push(`${indexPath}: must export ${exportedName}`);
      }
    }
  }

  if (!customFlowSource) {
    failures.push(`${customFlowPath}: must exist`);
  } else {
    reportMissingFragments(failures, customFlowPath, customFlowSource, [
      'from "./cl-eyedropper/index.js"',
      "loadElectronPreloadApi",
      '"wrapper:eyedropper-snapshot"',
      "installClEyeDropperScalingPatch",
      "removeClEyeDropperUi",
      '"Escape"',
      "sRGBHex",
      "data-canva-eyedropper-host",
      "2147483647",
      "activePickerCleanup",
    ], "CLeyedropper custom flow contract");
    if (/^\s*import\s+(?!type\b).*["']electron["'];?/m.test(customFlowSource)) {
      failures.push(`${customFlowPath}: must not import electron at runtime`);
    }
    if (customFlowSource.includes("ipcRenderer") && !customFlowSource.includes("await loadElectronPreloadApi()")) {
      failures.push(`${customFlowPath}: must not bypass loadElectronPreloadApi`);
    }
    if (/resolve\(\s*{\s*hex\s*}/.test(customFlowSource) || /return\s+{\s*hex\s*}/.test(customFlowSource)) {
      failures.push(`${customFlowPath}: must not return raw { hex } only; keep sRGBHex contract`);
    }
  }

  if (!implementationSource) {
    failures.push(`${implementationPath}: must exist`);
  } else {
    reportMissingFragments(failures, implementationPath, implementationSource, [
      "__canvaScalingPatchInstalled",
      "getScaledCanvasPosition",
      "_currentPosition",
      "_lastPixel",
      "removeEventListener",
      "eyedropper-overlay",
      "installClEyeDropperScalingPatch",
      ".toLowerCase()",
    ], "CLeyedropper scaling/cleanup contract");
    if (!implementationSource.includes("export function installClEyeDropperScalingPatch")) {
      failures.push(`${implementationPath}: must not remove scaling patch`);
    }
    if (!implementationSource.includes("removeEventListener(\"mousemove\"") || !implementationSource.includes("removeEventListener(\"click\"")) {
      failures.push(`${implementationPath}: must not remove cleanup of event listeners`);
    }
  }
}

function checkC420uiPackageOwnershipBoundary(rootDir: string, failures: string[]): void {
  checkProjectLayoutOwnership(rootDir, failures);
  checkForbiddenPaths(rootDir, failures);
  checkRequiredPaths(rootDir, failures);
  checkPackageScripts(rootDir, failures);
  checkRootTests(rootDir, failures);
  checkAdapterBoundary(rootDir, failures);
  checkBuildMetadataContracts(rootDir, failures);
  checkSourceHashContracts(rootDir, failures);
  checkRuntimeAssetsMetadataCopyContract(rootDir, failures);
  checkPreloadBundleContract(rootDir, failures);
  checkToolbarUIContract(rootDir, failures);
  checkTabSwitchingContract(rootDir, failures);
  checkCLEyeDropperContracts(rootDir, failures);
  checkBuildResourcesLayoutContract(rootDir, failures);
  checkRootLayoutMinimizationContract(rootDir, failures);
  checkDocs(rootDir, failures);
  checkValidateProjectScript(rootDir, failures);
  checkC420UIAutoBootstrapContract(rootDir, failures);
}

function main(): void {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  checkC420uiPackageOwnershipBoundary(rootDir, failures);

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
