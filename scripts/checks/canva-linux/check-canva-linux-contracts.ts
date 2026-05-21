#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  scripts?: Record<string, string>;
  build?: {
    appId?: string;
    directories?: {
      buildResources?: string;
    };
    linux?: {
      icon?: string;
    };
  };
  desktopName?: string;
};

const C420UI_OWNERSHIP_GUARDRAILS = [
  "c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under packages/c420ui.",
  "Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by packages/c420ui/checks.",
  "No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.",
  "Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under scripts/checks/canva-linux, root scripts/, root test/, or scripts/c420ui-adapter.",
  "When c420ui bootstrap entrypoints import Canva Linux adapter modules that transitively import scripts/canva-linux registries, the specific imported scripts/canva-linux submodules must remain in C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS.",
] as const;

const C420UI_OWNERSHIP_GUARDRAILS_BULLETS = [
  "- c420ui-owned scripts, checks, tests and generated bootstrap artifacts live only under `packages/c420ui`.",
  "- Canva Linux contracts enforce ownership boundaries only; c420ui bootstrap internals are validated by `packages/c420ui/checks`.",
  "- No temporary aliases, wrappers or legacy compatibility paths are allowed for c420ui-owned tooling.",
  "- Do not place c420ui-owned checks, scripts, tests, bootstrap gates or generated artifacts under `scripts/checks/canva-linux`, root `scripts/`, root `test/`, or `scripts/c420ui-adapter`.",
  "- When c420ui bootstrap entrypoints import Canva Linux adapter modules that transitively import `scripts/canva-linux` registries, the specific imported `scripts/canva-linux` submodules must remain in `C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS`.",
] as const;

function validateProjectHasRunStep(source: string, command: string): boolean {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(
    String.raw`run_step\s+["'][^"']*["']\s+${escaped}(?:\s|$)`,
    "m",
  ).test(source);
}

function checkFileContainsAll(
  rootDir: string,
  relativePath: string,
  fragments: readonly string[],
  failures: string[],
): void {
  const contents = readText(rootDir, relativePath);
  if (!contents) {
    failures.push(`${relativePath}: must exist`);
    return;
  }

  for (const fragment of fragments) {
    if (!contents.includes(fragment)) {
      failures.push(`${relativePath}: must include ${fragment}`);
    }
  }
}

function findProjectRoot(startDir = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd()): string {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root.");
    current = parent;
  }
}

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

function checkForbiddenPaths(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "scripts/build-c420ui-bootstrap.ts",
    "scripts/run-c420ui.ts",
    "scripts/run-c420ui-cli.ts",
    "scripts/c420ui-builder.ts",
    "electron",
    "build-resources",
    "data",
    "scripts/build-appimage.sh",
    "scripts/build-flatpak-bundle.sh",
    "scripts/install-native.sh",
    "scripts/checks/canva-linux/check-c420ui-bootstrap.ts",
    "scripts/checks/canva-linux/check-c420ui-artifact-gate.ts",
    "scripts/checks/canva-linux/check-c420ui-node-check.ts",
    "scripts/checks/canva-linux/c420ui-bootstrap-check-helpers.ts",
    "bootstrap/c420ui",
    "packages/canva-linux-assets/data",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must not exist`);
    }
  }
}

function checkRequiredPaths(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "packages/electron/assets/canva-icon.png",
    "packages/electron/main",
    "packages/electron/preload",
    "packages/electron/shared",
    "packages/electron/ui",
    "packages/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop",
    "packages/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    "packages/canva-linux-assets/icons",
    "packages/canva-linux-assets/icons/io.github.coletivo420.canva-linux.png",
    "packages/c420ui/scripts/build-bootstrap.ts",
    "packages/c420ui/scripts/c420ui-builder.ts",
    "packages/c420ui/scripts/run-c420ui.ts",
    "packages/c420ui/scripts/run-c420ui-cli.ts",
    "packages/c420ui/scripts/install-native.sh",
    "packages/c420ui/scripts/build-appimage.sh",
    "packages/c420ui/scripts/build-flatpak-bundle.sh",
    "packages/c420ui/scripts/install-detection-common.sh",
    "packages/c420ui/checks/check-bootstrap.ts",
    "packages/c420ui/checks/check-artifact-gate.ts",
    "packages/c420ui/checks/check-node.ts",
    "packages/c420ui/checks/bootstrap-check-helpers.ts",
    "packages/c420ui/checks/check-c420ui-core-contracts.ts",
    "packages/c420ui/test/artifact-fragments.test.ts",
    "packages/c420ui/test/bootstrap-artifact-hashes.test.ts",
    "packages/c420ui/test/bootstrap-artifacts.test.ts",
    "packages/c420ui/test/bootstrap-bundle.test.ts",
    "packages/c420ui/test/bootstrap-check-helpers.test.ts",
    "packages/c420ui/test/bootstrap-source-hash.test.ts",
    "packages/c420ui/test/bootstrap-syntax-gate.test.ts",
    "packages/c420ui/test/detected-installations-summary.test.ts",
    "packages/c420ui/test/keybindings.test.ts",
    "packages/c420ui/test/terminal-layout.test.ts",
    "packages/c420ui/bootstrap/generated/manifest.json",
    "packages/c420ui/bootstrap/generated/run-c420ui.cjs",
    "packages/c420ui/bootstrap/generated/run-c420ui-cli.cjs",
    "packages/c420ui/bootstrap/generated/c420ui-builder.cjs",
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${relativePath}: must exist`);
    }
  }
}

function checkProjectLayoutOwnership(rootDir: string, failures: string[]): void {
  const packageJson = readJson<PackageJson>(rootDir, "package.json");
  if (!packageJson) {
    failures.push("package.json: must be readable");
    return;
  }

  for (const [label, expected] of [
    ["package.json build.appId", "io.github.coletivo420.canva-linux"],
    ["package.json desktopName", "io.github.coletivo420.canva-linux.desktop"],
    ["package.json build.directories.buildResources", "packages/canva-linux-assets"],
    ["package.json build.linux.icon", "icons/io.github.coletivo420.canva-linux"],
  ] as const) {
    const actual =
      label === "package.json build.appId"
        ? packageJson.build?.appId
        : label === "package.json desktopName"
          ? packageJson.desktopName
          : label === "package.json build.directories.buildResources"
            ? packageJson.build?.directories?.buildResources
            : packageJson.build?.linux?.icon;
    if (actual !== expected) {
      failures.push(`${label}: must be ${expected}`);
    }
  }

  const iconBasenames = new Set([
    "icon.png",
    "app.png",
    "logo.png",
    "canva-linux.png",
  ]);

  for (const relativePath of collectFiles(rootDir, "packages/canva-linux-assets/icons")) {
    if (iconBasenames.has(path.basename(relativePath))) {
      failures.push(`${relativePath}: must use the canonical io.github.coletivo420.canva-linux basename`);
    }
  }

  for (const [relativePath, expectedParent] of [
    ["packages/electron/main", "packages/electron/main"],
    ["packages/electron/preload", "packages/electron/preload"],
    ["packages/electron/shared", "packages/electron/shared"],
    ["packages/electron/ui", "packages/electron/ui"],
    ["packages/electron/assets", "packages/electron/assets"],
    ["packages/canva-linux-assets/desktop", "packages/canva-linux-assets/desktop"],
    ["packages/canva-linux-assets/metainfo", "packages/canva-linux-assets/metainfo"],
    ["packages/canva-linux-assets/icons", "packages/canva-linux-assets/icons"],
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(`${expectedParent}: must exist`);
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
    "build:c420ui-bootstrap": "npm run build:metadata && esbuild packages/c420ui/scripts/build-bootstrap.ts --bundle --platform=node --target=node22 --format=cjs --external:esbuild --outfile=.build/packages/c420ui/scripts/build-bootstrap.cjs && node .build/packages/c420ui/scripts/build-bootstrap.cjs",
    "check:c420ui-node-check": "npm run build:c420ui-checks && node .build/packages/c420ui/checks/check-node.js",
    "check:c420ui-bootstrap": "npm run build:c420ui-checks && node .build/packages/c420ui/checks/check-bootstrap.js",
    "check:c420ui-bootstrap-artifacts": "npm run build:c420ui-checks && node .build/packages/c420ui/checks/check-artifact-gate.js",
    "test:c420ui": "npm run test -- packages/c420ui/test",
    "c420ui": "CANVA_SCRIPT_REPO_ROOT=$PWD npm run build:scripts && CANVA_SCRIPT_REPO_ROOT=$PWD node .build/packages/c420ui/scripts/run-c420ui.js",
    "c420ui:cli": "CANVA_SCRIPT_REPO_ROOT=$PWD npm run build:scripts && CANVA_SCRIPT_REPO_ROOT=$PWD node .build/packages/c420ui/scripts/run-c420ui-cli.js",
    "c420ui:install-native": "bash packages/c420ui/scripts/install-native.sh",
    "c420ui:build-appimage": "bash packages/c420ui/scripts/build-appimage.sh",
    "c420ui:build-flatpak-bundle": "bash packages/c420ui/scripts/build-flatpak-bundle.sh",
  };

  for (const [name, expected] of Object.entries(requiredScripts)) {
    if (scripts[name] !== expected) {
      failures.push(`package.json: script ${name} must be ${expected}`);
    }
  }

  const buildScripts = scripts["build:scripts"];
  if (typeof buildScripts !== "string") {
    failures.push("package.json: build:scripts must exist");
    return;
  }

  for (const requiredFragment of [
    "packages/c420ui/scripts/run-c420ui.ts",
    "packages/c420ui/scripts/run-c420ui-cli.ts",
    "packages/c420ui/scripts/c420ui-builder.ts",
    "packages/c420ui/bootstrap/build-recipe.ts",
    "packages/c420ui/bootstrap/source-hash.ts",
    "packages/c420ui/checks/check-bootstrap.ts",
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

  if (packageJson.build?.directories?.buildResources !== "packages/canva-linux-assets") {
    failures.push("package.json: build.directories.buildResources must be packages/canva-linux-assets");
  }

  if (packageJson.build?.linux?.icon !== "icons/io.github.coletivo420.canva-linux") {
    failures.push("package.json: build.linux.icon must be icons/io.github.coletivo420.canva-linux");
  }

  if (packageJson.build?.appId !== "io.github.coletivo420.canva-linux") {
    failures.push("package.json: build.appId must be io.github.coletivo420.canva-linux");
  }
}

function validateProjectScript(rootDir: string, failures: string[]): void {
  const relativePath = "scripts/validate-project.sh";
  const contents = readText(rootDir, relativePath);
  if (!contents) {
    failures.push(`${relativePath}: must exist`);
    return;
  }

  for (const requiredFragment of [
    "npm run lint",
    "npm test",
    "npm run docs:check-ai",
    "npm run docs:check-links",
    "npm run deps:check-policy",
    "npm run check:c420ui-node-check",
    "npm run check:c420ui-bootstrap-artifacts",
    "npm run check:c420ui-bootstrap",
    "npm run check:canva-linux",
    "bash scripts/check-flatpak-scope-policy.sh",
    "bash scripts/check-shell-ui-api.sh",
    "npm run typecheck",
    "npm run typecheck:strict",
    "git diff --exit-code",
  ] as const) {
    if (!validateProjectHasRunStep(contents, requiredFragment)) {
      failures.push(`${relativePath}: must include ${requiredFragment}`);
    }
  }

  for (const forbiddenFragment of [
    "npm run build:metadata",
    "npm run build:c420ui-bootstrap",
  ] as const) {
    if (validateProjectHasRunStep(contents, forbiddenFragment)) {
      failures.push(`${relativePath}: must not include ${forbiddenFragment}`);
    }
  }
}

function checkRootTests(rootDir: string, failures: string[]): void {
  for (const relativePath of collectFiles(rootDir, "test")) {
    const fileName = path.basename(relativePath);
    if (/^c420ui-.*\.test\.(?:ts|js|tsx|jsx)$/.test(fileName)) {
      failures.push(`${relativePath}: root c420ui tests must not exist`);
    }
  }
}

function checkAdapterBoundary(rootDir: string, failures: string[]): void {
  const adapterFiles = collectFiles(rootDir, "scripts/c420ui-adapter");
  for (const relativePath of adapterFiles) {
    const contents = readText(rootDir, relativePath);
    if (!contents) continue;
    for (const forbiddenFragment of [
      "packages/c420ui/checks/",
      "packages/c420ui/bootstrap/",
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
}

function checkDocs(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "CHANGELOG.md",
    "REVIEW.md",
    "docs/VALIDATION.md",
  ] as const) {
    checkFileContainsAll(rootDir, relativePath, C420UI_OWNERSHIP_GUARDRAILS, failures);
  }

  const aiGuardrailsPath = "docs/internal/AI_GUARDRAILS.md";
  const aiGuardrails = readText(rootDir, aiGuardrailsPath);
  if (!aiGuardrails) {
    failures.push(`${aiGuardrailsPath}: must exist`);
    return;
  }

  for (const bullet of C420UI_OWNERSHIP_GUARDRAILS_BULLETS) {
    if (!aiGuardrails.includes(bullet)) {
      failures.push(`${aiGuardrailsPath}: must include ${bullet}`);
    }
  }

  for (const forbiddenHeading of [
    "# c420ui-owned scripts",
    "# Canva Linux contracts",
    "# No temporary aliases",
    "# Do not place c420ui-owned",
    "# When c420ui bootstrap entrypoints",
  ] as const) {
    if (aiGuardrails.includes(forbiddenHeading)) {
      failures.push(`${aiGuardrailsPath}: must not contain duplicated H1-style guardrail headings`);
    }
  }
}

function checkC420uiPackageOwnershipBoundary(rootDir: string, failures: string[]): void {
  checkForbiddenPaths(rootDir, failures);
  checkRequiredPaths(rootDir, failures);
  checkProjectLayoutOwnership(rootDir, failures);
  checkPackageScripts(rootDir, failures);
  validateProjectScript(rootDir, failures);
  checkRootTests(rootDir, failures);
  checkAdapterBoundary(rootDir, failures);
  checkDocs(rootDir, failures);
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
