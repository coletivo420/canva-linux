#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-adapter/adapter";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../../canva-linux/project-root";
import { loadCanvaLinuxActions } from "../../canva-linux/actions/registry";
import { buildCanvaLinuxOverviewStatus } from "../../c420ui-adapter/detection/provider";

type ContractCheck = {
  name: string;
  run: () => number;
};

function runCheck(failures: string[], check: ContractCheck): void {
  try {
    const exitCode = check.run();
    if (exitCode !== 0) failures.push(`${check.name}: exited with ${exitCode}`);
  } catch (error) {
    failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hasDuplicateEntries(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

type CoreCheckFileKind = "shell" | "typescript";

const noParallelShellMenuActiveFiles: Array<{ path: string; kind: CoreCheckFileKind }> = [
  { path: "scripts/c420ui-builder.ts", kind: "typescript" },
  { path: "packages/c420ui/src/terminal/app.ts", kind: "typescript" },
  { path: "packages/c420ui/src/terminal/index.ts", kind: "typescript" },
];

const noParallelShellMenuForbiddenPatterns = [
  "run_interactive_mode",
  "print_main_screen",
  "menu_install",
  "menu_dev",
  "menu_maint",
  "Shell Tool",
  "SWITCH_TO_SHELL_EXIT_CODE",
  "TUI_SWITCH_TO_SHELL_EXIT_CODE",
  "shell fallback menu",
  "shell menu fallback",
  "--tui",
  "--no-tui",
  "CANVA_NO_TUI",
  "CANVA_C420UI",
  "F4 Shell Tool",
  "fallback para shell",
  "shell menu interativo",
  "opção “Use c420ui Tool”",
];

const detectionBooleanFields = [
  "nativeSystem",
  "nativeUser",
  "flatpakSystem",
  "flatpakUser",
  "appImageArtifacts",
];
const detectionVersionFields = [
  "nativeSystemVersion",
  "nativeUserVersion",
  "flatpakSystemVersion",
  "flatpakUserVersion",
  "appImageVersion",
  "nativeSystemFullVersion",
  "nativeUserFullVersion",
  "flatpakSystemFullVersion",
  "flatpakUserFullVersion",
  "appImageFullVersion",
];

const currentReleaseVersion = "0.1.4-15.Dev.9";
const currentReleaseDate = "2026-05-16";
const previousReleaseVersion = "0.1.4-12";
const releaseVersionPattern = /^\d+\.\d+\.\d+-\d+(?:\.Dev\.\d+)?$/;
const forbiddenCurrentReleaseVersions = ["0.1.4-dev.14", "0.1.4-rc.14", "0.1.4.14"];
const activePublicReleaseDocs = [
  "README.md",
  "docs/README.md",
  "docs/CLI.md",
  "docs/VALIDATION.md",
  "docs/RELEASE.md",
  "docs/MANUAL_VALIDATION.md",
  "CLAUDE.md",
  "REVIEW.md",
];

const releaseScripts = [
  "scripts/build-appimage.sh",
  "scripts/build-flatpak-bundle.sh",
  "scripts/package-guidance-common.sh",
  "scripts/validate-project.sh",
  "scripts/app-identity-common.sh",
];

function readProjectFile(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readOptionalProjectFile(rootDir: string, relativePath: string): string | undefined {
  try {
    return readProjectFile(rootDir, relativePath);
  } catch {
    return undefined;
  }
}


function collectProjectFiles(rootDir: string, relativeInputs: readonly string[]): string[] {
  const files: string[] = [];
  const visit = (relativePath: string): void => {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) return;
    const stats = fs.statSync(absolutePath);
    if (stats.isFile()) {
      if (/\.(?:ts|tsx|js|json|md|sh)$/.test(relativePath)) files.push(relativePath);
      return;
    }
    if (!stats.isDirectory()) return;
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
      visit(path.join(relativePath, entry.name).split(path.sep).join(path.posix.sep));
    }
  };
  for (const input of relativeInputs) visit(input);
  return files.sort((left, right) => left.localeCompare(right));
}

function stripShellComment(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("#")) return "";
  return line;
}

function stripTypeScriptComments(
  line: string,
  state: { inBlockComment: boolean },
): string {
  let remaining = line;
  let result = "";

  while (remaining.length) {
    if (state.inBlockComment) {
      const endIndex = remaining.indexOf("*/");
      if (endIndex === -1) return result;
      remaining = remaining.slice(endIndex + 2);
      state.inBlockComment = false;
      continue;
    }

    const lineCommentIndex = remaining.indexOf("//");
    const blockCommentIndex = remaining.indexOf("/*");
    if (
      lineCommentIndex !== -1 &&
      (blockCommentIndex === -1 || lineCommentIndex < blockCommentIndex)
    ) {
      result += remaining.slice(0, lineCommentIndex);
      return result;
    }
    if (blockCommentIndex !== -1) {
      result += remaining.slice(0, blockCommentIndex);
      remaining = remaining.slice(blockCommentIndex + 2);
      state.inBlockComment = true;
      continue;
    }

    result += remaining;
    return result;
  }

  return result;
}

function activeLine(
  line: string,
  kind: CoreCheckFileKind,
  state: { inBlockComment: boolean },
): string {
  if (kind === "shell") return stripShellComment(line);
  return stripTypeScriptComments(line, state);
}

function expectedEnvFor(actionId: string, scope: string): [string, string] | null {
  if (actionId.includes("flatpak")) return ["CANVA_FLATPAK_SCOPE", scope];
  if (actionId.includes("native")) return ["CANVA_NATIVE_SCOPE", scope];
  return null;
}

function expectedInstallDetectionKeyFor(actionId: string): string | null {
  const expected: Record<string, string> = {
    "install-native-system": "nativeSystem",
    "install-native-user": "nativeUser",
    "install-flatpak-system": "flatpakSystem",
    "install-flatpak-user": "flatpakUser",
  };
  return expected[actionId] ?? null;
}

function expectedPhaseFromVersion(version: string): string {
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) return version;

  throw new Error(`package.json version does not map to a project phase: ${version}`);
}

function expectedDisplayVersionFromVersion(version: string): string {
  const devPhaseMatch = version.match(/^(.*\.Dev)\.\d+$/);
  if (devPhaseMatch) return devPhaseMatch[1];

  return expectedPhaseFromVersion(version);
}

function shellValue(file: string, key: string): string | null {
  return file.match(new RegExp(`^${key}="([^"]+)"`, "m"))?.[1] ?? null;
}

function assertIncludes(
  failures: string[],
  file: string,
  contents: string,
  expected: string,
): void {
  if (!contents.includes(expected)) failures.push(`${file}: missing ${expected}`);
}

function validateReleaseShellScript(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  const fullPath = path.join(rootDir, relativePath);
  let contents: string;
  try {
    contents = readProjectFile(rootDir, relativePath);
  } catch {
    failures.push(`${relativePath}: file not found`);
    return;
  }
  const lines = contents.split(/\r?\n/);

  if (!lines[0]?.startsWith("#!")) {
    failures.push(`${relativePath}: shebang must be the first line`);
  }
  if (lines[1] !== "set -euo pipefail") {
    failures.push(`${relativePath}: set -euo pipefail must be on line 2`);
  }
  if (lines.length < 8) {
    failures.push(`${relativePath}: release script appears collapsed`);
  }

  const syntax = spawnSync("bash", ["-n", fullPath], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (syntax.status !== 0) {
    failures.push(
      `${relativePath}: bash -n failed: ${syntax.stderr || syntax.stdout}`,
    );
  }
}

function legacyBuilderPaths(): string[] {
  return [
    "canva-linux" + ".sh",
    "scripts/" + "canva-linux-c420ui-builder.ts",
    "bootstrap/c420ui/" + "canva-linux-c420ui-builder" + ".cjs",
    ".build/scripts/" + "canva-linux-c420ui-builder.js",
  ];
}

function validateBuilderArtifactsExist(rootDir: string, failures: string[]): void {
  for (const relativePath of [
    "scripts/c420ui-builder.ts",
    "canva-linux-c420ui-builder",
    "bootstrap/c420ui/c420ui-builder.cjs",
  ] as const) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) failures.push(`${relativePath} must exist`);
  }
}

function validateLegacyBuilderArtifactsRemoved(rootDir: string, failures: string[]): void {
  for (const relativePath of legacyBuilderPaths()) {
    if (fs.existsSync(path.join(rootDir, relativePath))) failures.push(`${relativePath} must not exist`);
  }
}

function validatePublicBuilderWrapper(rootDir: string, failures: string[]): void {
  const relativePath = "canva-linux-c420ui-builder";
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath} wrapper must exist`);
    return;
  }

  const mode = fs.statSync(fullPath).mode;
  if ((mode & 0o111) === 0) failures.push(`${relativePath} wrapper must be executable`);
  const wrapper = readProjectFile(rootDir, relativePath);
  for (const required of [
    "command -v node",
    "exit 127",
    "bootstrap/c420ui/c420ui-builder.cjs",
    ".build/scripts/c420ui-builder.js",
  ] as const) {
    if (!wrapper.includes(required)) failures.push(`${relativePath} wrapper must contain ${required}`);
  }
  for (const forbidden of [
    "canva-linux-c420ui-builder" + ".cjs",
    ".build/scripts/" + "canva-linux-c420ui-builder.js",
    "scripts/" + "canva-linux-c420ui-builder.ts",
  ] as const) {
    if (wrapper.includes(forbidden)) failures.push(`${relativePath} wrapper must not reference ${forbidden}`);
  }
}

function validateInternalBuilderSource(rootDir: string, failures: string[]): void {
  const relativePath = "scripts/c420ui-builder.ts";
  const source = readOptionalProjectFile(rootDir, relativePath);
  if (!source) {
    failures.push(`${relativePath} must exist`);
    return;
  }

  for (const fragment of [
    "c420ui-builder",
    "canva-linux-c420ui-builder",
    "Canva Linux Builder powered by c420ui",
    "isRuntimeOnlyFlag",
    "bootstrap/c420ui/run-c420ui-cli.cjs",
  ] as const) {
    if (!source.includes(fragment)) failures.push(`${relativePath}: missing ${fragment}`);
  }

  if (!source.includes("--force") || !source.includes("--yes")) {
    failures.push(`${relativePath}: --force must remain an alias for --yes`);
  }

  for (const forbidden of [
    "runCanvaLinuxC420UIBuilder",
    "DIRECT_ACTION_FLAGS",
    "allowRootDryRun",
    "parsed.directAction",
    "Boolean(parsed",
    "--install-native | --install-flatpak",
  ] as const) {
    if (source.includes(forbidden)) failures.push(`${relativePath}: must not contain ${forbidden}`);
  }

  const legacyRunCoreCli = "run-core-entry.sh " + "action-runner" + " --cli";
  if (source.includes(legacyRunCoreCli)) failures.push("builder direct actions must not call the legacy Action Runner CLI");
}

function validateRuntimeEnvFallbacksRemoved(rootDir: string, failures: string[]): void {
  const runtimeCliPath = "electron/main/runtime-cli.ts";
  const runtimeCliSource = readOptionalProjectFile(rootDir, runtimeCliPath);

  if (!runtimeCliSource) {
    failures.push(`${runtimeCliPath} must exist`);
  } else {
    if (!runtimeCliSource.includes('"--canva-debug"')) {
      failures.push("runtime-cli must support --canva-debug as the public debug flag");
    }
    if (!runtimeCliSource.includes('if (arg === "--debug") throw new Error(RESERVED_DEBUG_MESSAGE)')) {
      failures.push("runtime-cli must reject --debug as an Electron/Node-reserved flag");
    }
    if (!runtimeCliSource.includes('matchesValuedOption(arg, "--debug")')) {
      failures.push("runtime-cli must reject --debug=* as Electron/Node-reserved flags");
    }
    if (!runtimeCliSource.includes('reserved by Electron/Node')) {
      failures.push("runtime-cli must explain that --debug is reserved by Electron/Node");
    }
    if (!/function\s+matchesValuedOption\s*\(/.test(runtimeCliSource) || !/startsWith\s*\([^)]*=/.test(runtimeCliSource)) {
      failures.push("runtime-cli valued option matching must require --option=value boundaries");
    }
    if (/startsWith\s*\(\s*option\s*\)/.test(runtimeCliSource)) {
      failures.push("runtime-cli must not use broad startsWith(option) matching for valued options");
    }
  }

  const files = [
    "electron/shared/debug.ts",
    "electron/main/runtime.ts",
    "run.sh",
  ] as const;
  const forbiddenEnvNames = [
    "CANVA_" + "DEBUG",
    "CANVA_" + "DEBUG_LEVEL",
    "CANVA_" + "LINUX_PASSWORD_STORE",
    "CANVA_" + "DISABLE_GPU",
    "CANVA_" + "GPU_BACKEND",
    "CANVA_" + "FORCE_X11",
    "CANVA_" + "FORCE_WAYLAND",
    "CANVA_" + "DISABLE_WAYLAND_COLOR_MANAGER",
  ] as const;

  for (const file of files) {
    const contents = readOptionalProjectFile(rootDir, file);
    if (!contents) continue;
    for (const envName of forbiddenEnvNames) {
      if (contents.includes(envName)) failures.push(`${file}: must not restore legacy runtime env fallback ${envName}`);
    }
  }
}

function validateBuilderAliasDocs(rootDir: string, failures: string[]): void {
  const policyPath = "docs/c420ui/BUILDER_ALIAS.md";
  if (!fs.existsSync(path.join(rootDir, policyPath))) failures.push(`${policyPath} must exist`);
  const policy = readOptionalProjectFile(rootDir, policyPath) ?? "";
  for (const fragment of [
    "c420ui-builder",
    "canva-linux-c420ui-builder",
    "Canva Linux Builder powered by c420ui",
    "canva-linux",
    "no separate shell launcher",
    "--force",
  ] as const) {
    if (!policy.includes(fragment)) failures.push(`${policyPath}: missing ${fragment}`);
  }

  const expectedLinks: Array<[string, string]> = [
    ["README.md", "docs/c420ui/BUILDER_ALIAS.md"],
    ["docs/CLI.md", "c420ui/BUILDER_ALIAS.md"],
    ["docs/DEVELOPMENT.md", "c420ui/BUILDER_ALIAS.md"],
    ["docs/INSTALLATION.md", "c420ui/BUILDER_ALIAS.md"],
    ["docs/RELEASE.md", "c420ui/BUILDER_ALIAS.md"],
    ["docs/VALIDATION.md", "c420ui/BUILDER_ALIAS.md"],
    ["docs/c420ui/ARCHITECTURE.md", "BUILDER_ALIAS.md"],
    ["docs/canva-linux/ARCHITECTURE.md", "../c420ui/BUILDER_ALIAS.md"],
    ["docs/internal/AI_GUARDRAILS.md", "../c420ui/BUILDER_ALIAS.md"],
    ["docs/internal/REPOSITORY_INVENTORY.md", "../c420ui/BUILDER_ALIAS.md"],
    ["CHANGELOG.md", "docs/c420ui/BUILDER_ALIAS.md"],
    ["REVIEW.md", "docs/c420ui/BUILDER_ALIAS.md"],
    ["CLAUDE.md", "docs/c420ui/BUILDER_ALIAS.md"],
    ["GEMINI.md", "docs/c420ui/BUILDER_ALIAS.md"],
    ["packaging/flathub/README.md", "../../docs/c420ui/BUILDER_ALIAS.md"],
  ];
  const longDuplicate = "The alias gives this project a clear local command while internal bootstrap/build artifacts remain generic for c420ui-based projects.";
  for (const [file, link] of expectedLinks) {
    const contents = readOptionalProjectFile(rootDir, file);
    if (!contents) {
      failures.push(`${file}: builder alias documentation target is missing`);
      continue;
    }
    if (!contents.includes(link)) failures.push(`${file}: must link to ${link}`);
    if (contents.includes(longDuplicate)) failures.push(`${file}: must not duplicate the long builder alias explanation`);
    for (const line of contents.split(/\r?\n/)) {
      if (/canva-linux\.sh/.test(line) && !/removed|must not|forbidden|not restored|without restoring/i.test(line)) {
        failures.push(`${file}: must not recommend ${"canva-linux" + ".sh"}`);
      }
    }
  }
}

function validateLegacyBuilderPathReferences(rootDir: string, failures: string[]): void {
  const criticalFiles = [
    "package.json",
    "scripts/build-c420ui-bootstrap.ts",
    "scripts/c420ui-adapter/bootstrap/source-hash.ts",
    "scripts/c420ui-adapter/bootstrap/build-recipe.ts",
    "scripts/checks/canva-linux/check-c420ui-bootstrap.ts",
    "scripts/checks/canva-linux/check-canva-linux-contracts.ts",
    "bootstrap/c420ui/manifest.json",
    "canva-linux-c420ui-builder",
    "README.md",
    "docs/CLI.md",
  ] as const;
  for (const file of criticalFiles) {
    const contents = readOptionalProjectFile(rootDir, file);
    if (!contents) continue;
    for (const forbidden of legacyBuilderPaths()) {
      if (contents.includes(forbidden)) failures.push(`${file}: active path must not reference removed builder path ${forbidden}`);
    }
  }
}


function validateAdapterProjectContract(
  rootDir: string,
  adapter: ReturnType<typeof createCanvaLinuxC420UIAdapter>,
  failures: string[],
): void {
  const project = adapter.projectInfo();
  const capabilities = adapter.loadCapabilities();
  if (adapter.id !== "canva-linux") failures.push("adapter id must identify the project adapter");
  if (!project.projectName) failures.push("adapter must load project name");
  if (!project.appId) failures.push("adapter must load app id");
  if (!adapter.actions().length) failures.push("adapter must expose concrete actions through the generic bridge");
  if (!adapter.loadWorkflows().length) failures.push("adapter must expose c420ui workflows");
  if (!adapter.artifactWorkflows().length) failures.push("adapter must expose artifact workflows through the generic bridge");
  if (capabilities.supportsRootActions !== true) failures.push("adapter must declare root action support");
  if (capabilities.supportsDryRun !== true) failures.push("adapter must declare dry-run support");
  if (typeof adapter.runAction !== "function") failures.push("adapter must implement runAction");
  if (typeof adapter.overviewStatus !== "function") failures.push("adapter must implement overviewStatus");

  const runSource = readOptionalProjectFile(rootDir, "scripts/c420ui-adapter/run.ts") ?? "";
  const adapterSource = readOptionalProjectFile(rootDir, "scripts/c420ui-adapter/adapter.ts") ?? "";
  if (!runSource) failures.push("scripts/c420ui-adapter/run.ts must exist");
  if (!adapterSource) failures.push("scripts/c420ui-adapter/adapter.ts must exist");
  const developmentAdapterPath = "scripts/c420ui-adapter/development.ts";
  const actionAdapterPath = "scripts/c420ui-adapter/actions.ts";
  const developmentConfigPath = "config/canva-linux/development.json";
  if (!fs.existsSync(path.join(rootDir, developmentConfigPath))) {
    failures.push(`${developmentConfigPath}: development task recipes are required`);
  }
  if (!fs.existsSync(path.join(rootDir, developmentAdapterPath))) {
    failures.push(`${developmentAdapterPath}: development adapter is required`);
  }
  if (!fs.existsSync(path.join(rootDir, actionAdapterPath))) {
    failures.push(`${actionAdapterPath}: shared action descriptor loader is required`);
  }
  const developmentSource = readOptionalProjectFile(rootDir, developmentAdapterPath) ?? "";
  if (!adapterSource.includes("loadCanvaLinuxDevelopmentWorkflows")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must use loadCanvaLinuxDevelopmentWorkflows");
  }
  if (!adapterSource.includes("loadCanvaLinuxC420UIActions")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must use loadCanvaLinuxC420UIActions");
  }
  if (!developmentSource.includes("loadCanvaLinuxC420UIActions")) {
    failures.push(`${developmentAdapterPath}: must use loadCanvaLinuxC420UIActions`);
  }
  if (!developmentSource.includes("createC420UIDevelopmentWorkflowFromAction")) {
    failures.push(`${developmentAdapterPath}: must use createC420UIDevelopmentWorkflowFromAction`);
  }
  if (!developmentSource.includes("validateCanvaLinuxDevelopmentTasksAgainstActions")) {
    failures.push(`${developmentAdapterPath}: must validate development tasks against real actions`);
  }
  if (adapterSource.includes("function toC420UIActionDescriptor")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must not contain local toC420UIActionDescriptor conversion");
  }
  if (adapterSource.includes("toC420UIWorkflow")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must not contain local toC420UIWorkflow assembly");
  }
  if (adapterSource.includes("actions.map(toC420UIWorkflow)")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must not mount workflows from actions.map(toC420UIWorkflow)");
  }
  if (!runSource.includes("../../packages/c420ui/src/terminal")) {
    failures.push("scripts/c420ui-adapter/run.ts must import terminal UI from packages/c420ui/src/terminal");
  }
  if (!adapterSource.includes("../../packages/c420ui/src/terminal/logo") || !adapterSource.includes("../../packages/c420ui/src/terminal/settings")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must import logo/settings from packages/c420ui/src/terminal");
  }
  if (!adapterSource.includes("function overviewStatus") || !adapterSource.includes("buildCanvaLinuxOverviewStatus(resolvedRootDir)") || !adapterSource.includes("overviewStatus,")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must provide overviewStatus through the project bridge");
  }
  if (fs.existsSync(path.join(rootDir, "scripts/c420ui"))) {
    failures.push("scripts/c420ui must not exist");
  }
  for (const fragment of [
    "validateRootPolicy",
    "actionRequiresRootValidation",
    "ROOT_POLICY_EXIT_CODE",
    "buildActionEnvironment",
    "sudo-common.sh",
  ]) {
    if (adapterSource.includes(fragment)) {
      failures.push(`adapter must not depend on legacy root preflight: ${fragment}`);
    }
  }
  for (const fragment of [
    "Transitional bridge" + " execution path",
    "Defensive fallback" + " only",
    'action.kind === ' + '"planned"',
    "action.planned",
    "context." + "dryRun",
  ] as const) {
    if (adapterSource.includes(fragment)) {
      failures.push(`adapter.runAction must not restore Action Engine policy fallback: ${fragment}`);
    }
  }
  if (!adapterSource.includes("runC420UICommand")) {
    failures.push("adapter.runAction must continue using runC420UICommand");
  }
  if (!adapterSource.includes("env: context.env")) {
    failures.push("adapter must use the Action Engine/root provider prepared context.env");
  }
  if (adapterSource.includes("...context.env, ...(action.env")) {
    failures.push("adapter must not merge action.env after root provider environment preparation");
  }
  for (const forbidden of ["sudo", "password", "root prompt", "sudo-helper.sh"] as const) {
    if (adapterSource.includes(forbidden)) {
      failures.push(`adapter must not contain sudo/password/root prompt logic: ${forbidden}`);
    }
  }
}

function validateC420UIBridgeContract(rootDir: string, failures: string[]): void {
  const cliBridgePath = "scripts/c420ui-adapter/cli.ts";
  const cliEntrypointPath = "scripts/run-c420ui-cli.ts";
  if (!fs.existsSync(path.join(rootDir, cliBridgePath))) failures.push("Canva Linux c420ui CLI bridge must exist");
  if (!fs.existsSync(path.join(rootDir, cliEntrypointPath))) failures.push("Canva Linux c420ui CLI entrypoint must exist");

  const cliBridge = readOptionalProjectFile(rootDir, cliBridgePath) ?? "";
  const bridgeSource = readOptionalProjectFile(rootDir, "scripts/c420ui-adapter/bridge.ts") ?? "";
  if (!cliBridge.includes("emit:")) failures.push("Canva Linux c420ui CLI must forward emitted action logs");
  if (!cliBridge.includes("runC420UICli")) failures.push("scripts/c420ui-adapter/cli.ts must route direct actions through runC420UICli");
  if (!bridgeSource.includes("createC420UIActionEngine")) failures.push("scripts/c420ui-adapter/bridge.ts must route artifact actions through createC420UIActionEngine");
  if (!bridgeSource.includes("runC420UIArtifactWorkflow")) failures.push("scripts/c420ui-adapter/bridge.ts must use runC420UIArtifactWorkflow");
}

const checkAdapterContractRunner = (() => {
function main(): number {
  const rootDir = process.cwd();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const failures: string[] = [];

  validateAdapterProjectContract(rootDir, adapter, failures);
  validateC420UIBridgeContract(rootDir, failures);
  validateBuilderArtifactsExist(rootDir, failures);
  validateLegacyBuilderArtifactsRemoved(rootDir, failures);
  validatePublicBuilderWrapper(rootDir, failures);
  validateInternalBuilderSource(rootDir, failures);
  validateRuntimeEnvFallbacksRemoved(rootDir, failures);
  validateBuilderAliasDocs(rootDir, failures);
  validateLegacyBuilderPathReferences(rootDir, failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] adapter OK");
  return 0;
}

  return { main };
})();

const checkRootProviderContractRunner = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const providerPath = "scripts/c420ui-adapter/root-provider.ts";
  const adapterPath = "scripts/c420ui-adapter/adapter.ts";
  const cliPath = "scripts/c420ui-adapter/cli.ts";
  const runPath = "scripts/c420ui-adapter/run.ts";
  const provider = read(rootDir, providerPath);
  const adapter = read(rootDir, adapterPath);
  const cli = read(rootDir, cliPath);
  const run = read(rootDir, runPath);
  const failures: string[] = [];

  for (const fragment of [
    "createCanvaLinuxRootProvider",
    "createC420UILinuxRootProviderBase",
    'sudoHelperPath: "packages/c420ui/host/linux/sudo-helper.sh"',
    'rootAuthEnvKey: "C420UI_ROOT_AUTH"',
    "buildCanvaLinuxRootActionEnvironment",
    "buildActionEnvironment: buildCanvaLinuxRootActionEnvironment",
    "C420UI_ACTION_SCOPE",
    "buildCanvaLinuxOverviewStatus",
    "conditionalSystemRootActionIds",
    "purge",
    "uninstall-detected",
    "CANVA_NATIVE_SCOPE",
    "CANVA_FLATPAK_SCOPE",
    "warning:",
  ]) {
    if (!provider.includes(fragment)) {
      failures.push(`missing Canva Linux root provider fragment: ${fragment}`);
    }
  }

  for (const fragment of [
    "validateRootAccess(rootDir",
    "buildRootActionEnvironment",
    "spawnSync",
  ]) {
    if (provider.includes(fragment)) {
      failures.push(`Canva Linux root provider must delegate generic root fragment: ${fragment}`);
    }
  }

  if (fs.existsSync(path.join(rootDir, "scripts/" + "sudo-common.sh"))) {
    failures.push("scripts/" + "sudo-common.sh must not exist; use packages/c420ui/host/linux/sudo-helper.sh");
  }
  if (!fs.existsSync(path.join(rootDir, "packages/c420ui/host/linux/sudo-helper.sh"))) {
    failures.push("packages/c420ui/host/linux/sudo-helper.sh must back privileged actions");
  }
  const rootProviderContract = read(rootDir, "packages/c420ui/src/root-provider.ts");
  const linuxRootProvider = read(rootDir, "packages/c420ui/src/linux-root-provider.ts");
  const actionEngine = read(rootDir, "packages/c420ui/src/action-engine.ts");
  const interactiveRunner = read(rootDir, "packages/c420ui/src/terminal/interactive-action-runner.ts");
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  for (const [contractPath, contractSource, fragment] of [
    ["packages/c420ui/src/root-provider.ts", rootProviderContract, "validateRootAccessWithInput?"],
    ["packages/c420ui/src/linux-root-provider.ts", linuxRootProvider, "--validate-stdin"],
    ["packages/c420ui/src/action-engine.ts", actionEngine, "requestRootAccess"],
    ["packages/c420ui/src/terminal/interactive-action-runner.ts", interactiveRunner, "requestRootAccess"],
    ["packages/c420ui/src/terminal/app.ts", app, "inputDialog"],
  ] as const) {
    if (!contractSource.includes(fragment)) {
      failures.push(`${contractPath}: missing interactive root auth fragment ${fragment}`);
    }
  }
  if (app.includes("appendLogText(password") || app.includes("appendLogText(result.value")) {
    failures.push("packages/c420ui/src/terminal/app.ts must not log submitted administrator passwords");
  }
  if (!cli.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux CLI must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("rootProvider: createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass rootProvider to terminal runtime");
  }
  if (!run.includes("runC420UITerminalApp")) {
    failures.push("Canva Linux interactive c420ui must start through runC420UITerminalApp");
  }
  for (const fragment of [
    "actionRequiresRootValidation",
    "buildActionEnvironment",
    "ROOT_POLICY_EXIT_CODE",
    "validateRootPolicy",
    "scripts/" + "sudo-common.sh",
  ]) {
    if (adapter.includes(fragment)) {
      failures.push(
        `adapter must not import or implement legacy root policy fragment: ${fragment}`,
      );
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] root provider OK");
  return 0;
}

  return { main };
})();


function checkDependentProjectAdapterBoundary(failures: string[]): void {
  const rootDir = findProjectRoot();
  const runEntrypointPath = "scripts/run-c420ui.ts";
  const runPath = "scripts/c420ui-adapter/run.ts";
  const bridgePath = "scripts/c420ui-adapter/bridge.ts";
  const adapterPath = "scripts/c420ui-adapter/adapter.ts";
  const rootProviderPath = "scripts/c420ui-adapter/root-provider.ts";
  const runEntrypoint = readProjectFile(rootDir, runEntrypointPath);
  const run = readProjectFile(rootDir, runPath);
  const bridge = readProjectFile(rootDir, bridgePath);
  const adapter = readProjectFile(rootDir, adapterPath);
  const rootProvider = readProjectFile(rootDir, rootProviderPath);

  for (const [relativePath, source] of [
    [adapterPath, adapter],
    [bridgePath, bridge],
    ["scripts/c420ui-adapter/cli.ts", readProjectFile(rootDir, "scripts/c420ui-adapter/cli.ts")],
  ] as const) {
    for (const fragment of [
      "adapter.runAction(actionId, contextForAction())",
      "scripts/" + "ensure-npm-dependencies.sh",
      "ensure_" + "npm_dependencies",
      "scripts/" + "c420ui-" + "canva-linux",
      "scripts/" + "sudo-common.sh",
      "canva_" + "sudo",
      "CANVA_" + "REQUIRED_NPM_DEPS",
      "CANVA_" + "SKIP_NPM_INSTALL",
      "CANVA_" + "NPM_REPAIR",
    ] as const) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: dependent project adapter must not restore legacy transitional fragment ${fragment}`);
      }
    }
  }

  const requiredFragments: Array<[string, string, string]> = [
    [runPath, run, "runC420UITerminalApp"],
    [bridgePath, bridge, "runC420UIArtifactWorkflow"],
    [bridgePath, bridge, "createC420UIActionEngine"],
    [rootProviderPath, rootProvider, "createC420UILinuxRootProviderBase"],
    [adapterPath, adapter, "runC420UICommand"],
  ];
  for (const [relativePath, source, fragment] of requiredFragments) {
    if (!source.includes(fragment)) {
      failures.push(`${relativePath}: dependent project adapter must use c420ui provider/engine ${fragment}`);
    }
  }

  for (const [relativePath, source] of [
    [runEntrypointPath, runEntrypoint],
    [runPath, run],
  ] as const) {
    if (source.includes("process.getuid")) {
      failures.push(`${relativePath}: root launch guard belongs to c420ui terminal runtime`);
    }
  }

  for (const relativePath of [
    "scripts/c420ui-adapter/adapter.ts",
    "scripts/c420ui-adapter/artifacts.ts",
    "scripts/c420ui-adapter/bridge.ts",
    "scripts/c420ui-adapter/cli.ts",
    "scripts/c420ui-adapter/dependencies.ts",
    "scripts/c420ui-adapter/root-provider.ts",
    "scripts/c420ui-adapter/run.ts",
  ] as const) {
    const source = readProjectFile(rootDir, relativePath);
    for (const fragment of [
      "rootLaunchGuardMessage",
      "run-core-entry.sh",
      "action-runner",
      "overview-status",
      "adapter.runAction(actionId, contextForAction())",
    ] as const) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: dependent project adapter must not restore ${fragment}`);
      }
    }
    for (const fragment of [
      "createApp(",
      "blessed",
      "FOCUS_ZONES",
      "validateRootAccess(rootDir",
      "buildRootActionEnvironment",
    ] as const) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: dependent project adapter must not reimplement c420ui runtime/provider fragment ${fragment}`);
      }
    }
  }

  if (adapter.includes("spawnSync")) {
    failures.push(`${adapterPath}: dependent project adapter must use runC420UICommand instead of spawning commands directly`);
  }
  if (rootProvider.includes("spawnSync")) {
    failures.push(`${rootProviderPath}: dependent project root provider must delegate command execution to c420ui Linux root provider base`);
  }
}

function checkHostDependencyProviderContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const dependenciesPath = "scripts/c420ui-adapter/dependencies.ts";
  const configPath = "config/canva-linux/dependencies.json";
  const runEntrypointPath = "scripts/run-c420ui.ts";

  if (!fs.existsSync(path.join(rootDir, dependenciesPath))) {
    failures.push(`${dependenciesPath}: missing Canva Linux dependency loader`);
    return;
  }
  if (!fs.existsSync(path.join(rootDir, configPath))) {
    failures.push(`${configPath}: missing Canva Linux dependency declaration`);
    return;
  }

  const dependencies = readProjectFile(rootDir, dependenciesPath);
  const config = readProjectFile(rootDir, configPath);
  const runEntrypoint = readProjectFile(rootDir, runEntrypointPath);
  const legacyProviderPath = path.join(rootDir, "scripts/c420ui-adapter/host-dependencies.ts");
  const legacyProjectAdapterDir = path.join(rootDir, "scripts", "c420ui-" + "canva-linux");
  if (fs.existsSync(legacyProjectAdapterDir)) {
    failures.push("scripts/" + "c420ui-" + "canva-linux must not exist");
  }

  for (const fragment of [
    "loadCanvaLinuxDependencyConfig",
    "ensureCanvaLinuxHostDependencies",
    "runC420UIHostDependencyEnsure",
    "validateC420UIHostDependencyConfig",
    "config/canva-linux/dependencies.json",
  ] as const) {
    if (!dependencies.includes(fragment)) {
      failures.push(`${dependenciesPath}: missing dependency loader fragment ${fragment}`);
    }
  }
  for (const forbidden of [
    "ensureCanvaLinuxHostDependencies",
    "isC420UIHostDependencyFailure",
    "ensureHostDependencies",
  ] as const) {
    if (runEntrypoint.includes(forbidden)) {
      failures.push(`${runEntrypointPath}: must not repair dependent project dependencies before c420ui starts (${forbidden})`);
    }
  }

  const adapterRun = readProjectFile(rootDir, "scripts/c420ui-adapter/run.ts");
  for (const fragment of [
    "startupTasks",
    "Checking dependent project dependencies",
    "ensureCanvaLinuxHostDependencies",
  ] as const) {
    if (!adapterRun.includes(fragment)) {
      failures.push(`scripts/c420ui-adapter/run.ts: must wire dependency repair as a c420ui startup task (${fragment})`);
    }
  }
  for (const forbidden of [
    "scripts/" + "ensure-npm-dependencies.sh",
    "npm ci",
    "npm install",
    "CANVA_" + "REQUIRED_NPM_DEPS",
    "CANVA_" + "SKIP_NPM_INSTALL",
    "CANVA_" + "NPM_REPAIR",
  ] as const) {
    if (runEntrypoint.includes(forbidden)) {
      failures.push(`${runEntrypointPath}: must not contain dependency policy fragment ${forbidden}`);
    }
    if (dependencies.includes(forbidden)) {
      failures.push(`${dependenciesPath}: must not contain dependency policy fragment ${forbidden}`);
    }
  }
  if (fs.existsSync(legacyProviderPath)) {
    const legacyProvider = fs.readFileSync(legacyProviderPath, "utf8");
    if (
      legacyProvider.includes("createCanvaLinuxHostDependencyProvider") ||
      legacyProvider.includes("scripts/" + "ensure-npm-dependencies.sh")
    ) {
      failures.push("scripts/c420ui-adapter/host-dependencies.ts: legacy shell provider must not be active");
    }
  }
  for (const fragment of ["esbuild", "electron", "electron-builder", "@typescript-eslint/parser", "blessed"] as const) {
    if (!config.includes(fragment)) {
      failures.push(`${configPath}: missing declared npm dependency ${fragment}`);
    }
  }
}

const checkC420UISudoHelperContractRunner = (() => {
function findCheckedFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push(...findCheckedFiles(fullPath));
    } else if (/\.(sh|ts)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isAllowedSudoText(line: string): boolean {
  return [
    "with sudo or as root.",
    "Do not run Canva Linux Builder powered by c420ui with sudo or as root.",
    "Do not run this tool with sudo or as root.",
    "Do not run the Tool with sudo or as root",
    "root/sudo launch is blocked",
    "must not instruct users to run ./canva-linux-c420ui-builder with sudo",
    "sudo password must never be written to logs",
    "sudo stdin must never be logged",
  ].some((allowed) => line.includes(allowed));
}

function main(): number {
  const rootDir = findProjectRoot();
  const scriptsDir = path.join(rootDir, "scripts");
  const sudoHelperPath = path.join(rootDir, "packages/c420ui/host/linux/sudo-helper.sh");
  const tuiAppPath = path.join(rootDir, "packages/c420ui/src/terminal/app.ts");
  const checkedFiles = [
    ...findCheckedFiles(scriptsDir),
    path.join(rootDir, "scripts/c420ui-builder.ts"),
  ].filter((f) => {
    const relative = path.relative(rootDir, f);
    return (
      relative !== "scripts/checks/canva-linux/check-canva-linux-contracts.ts" &&
      relative !== "scripts/core/check-ai-guardrails.ts"
    );
  });
  const failures: string[] = [];
  const sudoHelper = fs.readFileSync(sudoHelperPath, "utf8");
  const tuiApp = fs.readFileSync(tuiAppPath, "utf8");
  if (
    !tuiApp.includes("createInteractiveActionRunner") ||
    !tuiApp.includes("createActionEngine: createC420UIActionEngine") ||
    tuiApp.includes('from "./process-runner"') ||
    tuiApp.includes('const runnerArgs = ["action-runner", "--id", action.id]')
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: actions must execute through the shared c420ui Action Engine",
    );
  }

  if (!/--validate-stdin\)\s*c420ui_sudo_validate_stdin\s*;;/.test(sudoHelper)) {
    failures.push(
      "packages/c420ui/host/linux/sudo-helper.sh: dispatcher must implement --validate-stdin",
    );
  }

  if (!sudoHelper.includes('sudo -S -v -p ""')) {
    failures.push(
      'packages/c420ui/host/linux/sudo-helper.sh: --validate-stdin must validate with sudo -S -v -p ""',
    );
  }

  if (!/password\s*=\s*"\$\(cat\)"/.test(sudoHelper)) {
    failures.push("packages/c420ui/host/linux/sudo-helper.sh: --validate-stdin must read stdin");
  }

  const interactiveRunnerPath = path.join(
    rootDir,
    "packages/c420ui/src/terminal/interactive-action-runner.ts",
  );
  const interactiveRunner = fs.readFileSync(interactiveRunnerPath, "utf8");

  if (
    !interactiveRunner.includes("interactiveActionRequiresConfirmation(action)") ||
    !interactiveRunner.includes('status: "canceled"') ||
    !interactiveRunner.includes("!confirmed")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/interactive-action-runner.ts: confirmation cancellations must stop before root or bridge execution",
    );
  }

  if (
    !interactiveRunner.includes("rootProvider: options.rootProvider") ||
    !interactiveRunner.includes("engine.runAction(action")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/interactive-action-runner.ts: privileged actions must use the c420ui root provider before bridge execution",
    );
  }

  if (/appendLogText\([^)]*password/s.test(tuiApp)) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: sudo password must never be written to logs",
    );
  }

  for (const fullPath of checkedFiles) {
    const relativePath = path.relative(rootDir, fullPath);
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.trim().startsWith("#")) return;
      if (isAllowedSudoText(line)) return;
      if (
        /(^|[^A-Za-z0-9_])sudo(\s|$)/.test(line) ||
        /['"]sudo['"]/.test(line)
      ) {
        failures.push(
          `${relativePath}:${index + 1}: raw sudo is forbidden; use packages/c420ui/host/linux/sudo-helper.sh`,
        );
      }
    });
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] c420ui sudo helper OK");
  return 0;
}

  return { main };
})();

const checkPublicBrandingContract = (() => {
const publicFiles = [
  "README.md",
  "docs/TECHNICAL.md",
  "docs/VALIDATION.md",
  "docs/TYPESCRIPT.md",
  "docs/CLI.md",
  "docs/RELEASE.md",
  "CHANGELOG.md",
  "config/canva-linux/project-ui.json",
];

const bannedPhrases = [
  "Terminal Assistant",
  "Blessed TUI",
  "Canva Linux Terminal Assistant",
  "C420UI",
];

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const relativePath of publicFiles) {
    const content = read(rootDir, relativePath);
    for (const phrase of bannedPhrases) {
      if (content.includes(phrase)) {
        failures.push(`${relativePath}: use c420ui instead of ${phrase}`);
      }
    }
    if (/\bTUI\b/.test(content)) {
      failures.push(`${relativePath}: do not use TUI as a product name`);
    }
  }

  const readme = read(rootDir, "README.md");
  if (!readme.includes("c420ui terminal interface")) {
    failures.push("README.md: must name the terminal interface c420ui");
  }
  if (!readme.includes("**c420ui workspace**")) {
    failures.push("README.md: feature matrix must use c420ui workspace");
  }

  const projectUi = JSON.parse(read(rootDir, "config/canva-linux/project-ui.json")) as {
    c420uiTitle?: string;
  };
  if (!projectUi.c420uiTitle?.includes("c420ui terminal interface")) {
    failures.push("config/canva-linux/project-ui.json: c420uiTitle must use c420ui terminal interface");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] public branding OK");
  return 0;
}

  return { main };
})();

const checkProjectBoundaryContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(
  failures: string[],
  content: string,
  fragment: string,
  message: string,
) {
  if (!content.includes(fragment)) {
    failures.push(message);
  }
}

function main(): number {
  const rootDir = findProjectRoot();
  const legacyAdapterDir = path.join(rootDir, "scripts", "c420ui-" + "canva-linux");
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  const packageTypes = read(rootDir, "packages/c420ui/src/types.ts");
  const logo = read(rootDir, "packages/c420ui/src/terminal/logo.ts");
  const settings = read(rootDir, "packages/c420ui/src/terminal/settings.ts");
  const adapter = read(rootDir, "scripts/c420ui-adapter/adapter.ts");
  const projectUi = read(rootDir, "config/canva-linux/project-ui.json");
  const failures: string[] = [];
  if (fs.existsSync(legacyAdapterDir)) {
    failures.push("scripts/" + "c420ui-" + "canva-linux: legacy project-named c420ui adapter directory must not exist");
  }

  assertIncludes(
    failures,
    app,
    "../action-engine",
    "packages/c420ui/src/terminal/app.ts must import generic c420ui internals from the package",
  );

  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIBrandConfig",
    "packages/c420ui/src/types.ts must export C420UIBrandConfig",
  );
  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIProjectConfig",
    "packages/c420ui/src/types.ts must export C420UIProjectConfig",
  );
  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIConfig",
    "packages/c420ui/src/types.ts must export C420UIConfig",
  );

  const forbiddenCoreFragments = [
    "Canva Linux",
    "CANVA LINUX",
    "canva-linux",
    "io.github.coletivo420.canva-linux",
    "https://github.com/coletivo420/canva-linux",
    "CANVA_LOGO_LINES",
  ];
  for (const fragment of forbiddenCoreFragments) {
    if (
      app.includes(fragment) ||
      logo.includes(fragment) ||
      settings.includes(fragment)
    ) {
      failures.push(
        `c420ui core must not hardcode project metadata: ${fragment}`,
      );
    }
  }


  assertIncludes(
    failures,
    read(rootDir, "scripts/c420ui-adapter/run.ts"),
    "../../packages/c420ui/src/terminal",
    "scripts/c420ui-adapter/run.ts must import terminal UI from packages/c420ui/src/terminal",
  );

  const projectFields = [
    "logoLines",
    "appId",
    "executableName",
    "repositoryUrl",
    "launcherCommand",
    "stateDirectoryName",
  ];
  for (const field of projectFields) {
    assertIncludes(
      failures,
      app,
      `opts.project.${field}`,
      `packages/c420ui/src/terminal/app.ts must read ${field} from project config`,
    );
    if (
      !adapter.includes(`${field}: projectUi.${field}`) &&
      !adapter.includes(`${field}: [...projectUi.${field}]`)
    ) {
      failures.push(
        `scripts/c420ui-adapter/adapter.ts must inject ${field} from config/canva-linux/project-ui.json`,
      );
    }
    assertIncludes(
      failures,
      projectUi,
      `"${field}":`,
      `config/canva-linux/project-ui.json must define ${field}`,
    );
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] project boundary OK");
  return 0;
}

  return { main };
})();

const checkArtifactRecipesContract = (() => {
function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const rootDir = process.cwd();
  const workflows = adapter.loadArtifactWorkflows();
  const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const artifactsConfigPath = "config/canva-linux/artifacts.json";
  const artifactsAdapterPath = "scripts/c420ui-adapter/artifacts.ts";
  const artifactsConfigFullPath = path.join(rootDir, artifactsConfigPath);
  const artifactsSource = fs.readFileSync(path.join(rootDir, artifactsAdapterPath), "utf8");
  const artifactsConfigSource = fs.existsSync(artifactsConfigFullPath)
    ? fs.readFileSync(artifactsConfigFullPath, "utf8")
    : "";
  const bridgeSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-adapter/bridge.ts"), "utf8");
  const failures: string[] = [];

  if (!fs.existsSync(artifactsConfigFullPath)) {
    failures.push(`${artifactsConfigPath}: artifact workflow recipes are required`);
  }
  if (!artifactsSource.includes(artifactsConfigPath)) {
    failures.push(`${artifactsAdapterPath}: must load ${artifactsConfigPath}`);
  }

  for (const fragment of [
    "validateC420UIArtifactRecipeConfig",
    "validateC420UIArtifactWorkflowsAgainstActions",
    "resolveC420UIArtifactOutputPattern",
  ]) {
    if (!artifactsSource.includes(fragment)) {
      failures.push(`${artifactsAdapterPath}: missing ${fragment}`);
    }
  }

  for (const hardcodedWorkflow of [
    'id: "appimage"',
    'id: "flatpak"',
    'id: "native-system"',
    'id: "native-user"',
    'id: "release-tarball"',
    'id: "release-checksums"',
    'id: "deb"',
    'id: "rpm"',
    'id: "aur"',
  ]) {
    if (artifactsSource.includes(hardcodedWorkflow)) {
      failures.push(`${artifactsAdapterPath}: must not hardcode artifact workflow declarations (${hardcodedWorkflow})`);
    }
  }

  for (const fragment of [
    "ARTIFACT_WORKFLOW_KINDS",
    "ARTIFACT_WORKFLOW_SCOPES",
    "validateCanvaLinuxArtifactsConfigShape",
    "assertKnownValue",
    "validateOutputPattern",
  ]) {
    if (artifactsSource.includes(fragment)) {
      failures.push(`${artifactsAdapterPath}: must not define generic artifact recipe validation (${fragment})`);
    }
  }

  for (const fragment of [
    "createC420UIActionEngine",
    "createCanvaLinuxRootProvider",
    "engine.runActionById",
    "runC420UIArtifactWorkflow",
  ]) {
    if (!bridgeSource.includes(fragment)) {
      failures.push(`scripts/c420ui-adapter/bridge.ts: missing ${fragment}`);
    }
  }

  for (const fragment of [
    "return adapter.runAction(actionId",
    "adapter.runAction(actionId, contextForAction())",
  ]) {
    if (bridgeSource.includes(fragment)) {
      failures.push(`scripts/c420ui-adapter/bridge.ts: must not bypass Action Engine with ${fragment}`);
    }
  }


  if (artifactsConfigSource.includes("x64")) {
    failures.push(`${artifactsConfigPath}: artifact recipes must not normalize generated architecture names to x64`);
  }
  if (artifactsConfigSource.includes("${arch}")) {
    failures.push(`${artifactsConfigPath}: artifact recipes must preserve generated architecture globs instead of \${arch}`);
  }

  for (const id of ["appimage", "flatpak", "native-system", "native-user"]) {
    if (!workflowsById.has(id)) failures.push(`missing required artifact workflow: ${id}`);
  }

  for (const id of ["deb", "rpm", "aur"]) {
    const workflow = workflowsById.get(id);
    if (!workflow) {
      failures.push(`missing planned artifact workflow: ${id}`);
    } else if (!workflow.planned) {
      failures.push(`${id}: package workflow must be marked planned`);
    }
  }

  for (const workflow of workflows) {
    if (!workflow.id || !workflow.label) failures.push("artifact workflows must have id and label");
    if (!workflow.planned && workflow.kind !== "native" && !workflow.outputPattern) {
      failures.push(`${workflow.id}: concrete packaged artifacts must declare outputPattern`);
    }
    if (workflow.scope === "system" && workflow.requiresRoot !== true) {
      failures.push(`${workflow.id}: system-scoped workflows must require root`);
    }
    if (workflow.scope === "user" && workflow.requiresRoot === true) {
      failures.push(`${workflow.id}: user-scoped workflows must not require root`);
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] artifact recipes OK");
  return 0;
}

  return { main };
})();

const checkAppImageContractRunner = (() => {
function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const appImage = adapter.loadArtifactWorkflows().find((workflow) => workflow.kind === "appimage");
  const failures: string[] = [];
  if (capabilities.supportsArtifacts !== true) failures.push("artifact capability must be supported");
  if (!appImage) failures.push("AppImage artifact workflow is required");
  if (appImage && appImage.buildActionId !== "bundle-appimage") failures.push("AppImage workflow must use bundle-appimage action");
  if (appImage && appImage.validateActionId !== "validate-appimage") failures.push("AppImage workflow must use validate-appimage action");
  if (appImage && !("outputPattern" in appImage) || ("outputPattern" in (appImage ?? {}) && !String((appImage as { outputPattern?: string }).outputPattern).includes(".AppImage"))) {
    failures.push("AppImage workflow must declare AppImage output pattern");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] AppImage OK");
  return 0;
}

  return { main };
})();

const checkFlatpakContractRunner = (() => {
function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const flatpak = adapter.loadArtifactWorkflows().find((workflow) => workflow.kind === "flatpak");
  const failures: string[] = [];
  if (capabilities.supportsArtifacts !== true) failures.push("artifact capability must be supported");
  if (!flatpak) failures.push("Flatpak artifact workflow is required");
  if (flatpak && flatpak.buildActionId !== "bundle-flatpak") failures.push("Flatpak workflow must use bundle-flatpak action");
  if (flatpak && flatpak.validateActionId !== "validate-project") failures.push("Flatpak workflow must use validate-project action");
  if (flatpak && !("outputPattern" in flatpak) || ("outputPattern" in (flatpak ?? {}) && !String((flatpak as { outputPattern?: string }).outputPattern).includes(".flatpak"))) {
    failures.push("Flatpak workflow must declare flatpak output pattern");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] Flatpak OK");
  return 0;
}

  return { main };
})();

const checkReleaseArtifactsContract = (() => {
function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const releaseWorkflows = adapter.loadArtifactWorkflows().filter((workflow) => workflow.scope === "release");
  const failures: string[] = [];
  if (!releaseWorkflows.length) failures.push("release artifact workflows are required");
  const outputPatterns = releaseWorkflows.map((workflow) => ("outputPattern" in workflow ? String(workflow.outputPattern ?? "") : ""));
  for (const expected of ["linux-unpacked-*.tar.gz", "SHA256SUMS"]) {
    if (!outputPatterns.some((pattern) => pattern.includes(expected))) {
      failures.push(`release artifacts must include ${expected}`);
    }
  }
  const releaseAction = adapter.loadActions().find((action) => action.id === "release-artifacts");
  const releaseLinked = adapter.loadArtifactWorkflows().filter((workflow) => workflow.releaseActionId === "release-artifacts");
  if (!releaseAction) failures.push("release-artifacts action is required");
  if (releaseAction && (releaseAction.kind !== "planned" || releaseAction.planned !== true)) {
    failures.push("release-artifacts action must remain planned until publication is executable");
  }
  if (!releaseLinked.some((workflow) => workflow.kind === "appimage")) failures.push("release must include AppImage workflow");
  if (!releaseLinked.some((workflow) => workflow.kind === "flatpak")) failures.push("release must include Flatpak workflow");
  if (adapter.loadCapabilities().supportsRelease !== true) failures.push("release capability must be supported");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] release artifacts OK");
  return 0;
}

  return { main };
})();

const checkLauncherSessionLogsContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  const launcher = read(rootDir, "scripts/c420ui-builder.ts");

  if (!launcher.includes("fs.writeFileSync(sessionLog")) {
    failures.push("scripts/c420ui-builder.ts: builder must create/truncate the session log once");
  }
  if (!app.includes('flags: "a"')) {
    failures.push("packages/c420ui/src/terminal/app.ts: c420ui must append to the launcher session log");
  }
  if (!app.includes("importLauncherSessionLog")) {
    failures.push("packages/c420ui/src/terminal/app.ts: launcher logs must be imported when Tool logs are enabled");
  }
  if (!app.includes("Tool |") || !app.includes("Action |")) {
    failures.push("packages/c420ui/src/terminal/app.ts: Tool logs and Action logs must remain distinguishable");
  }
  if (!app.includes("shouldDisplayLogLine") || !app.includes("isCriticalToolLog")) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: critical Tool warnings/errors must remain visible when general Tool logs are disabled",
    );
  }
  if (
    !app.includes("sessionLogUnavailableWarningShown") ||
    !app.includes("warnSessionLogUnavailableOnce") ||
    !app.includes("Session log stream is unavailable") ||
    !app.includes("if (!sessionStream || sessionStreamOpenError)") ||
    !app.includes("recordSessionStreamError") ||
    !app.includes('displayLogLine(warning, "system")')
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: writeSession must warn once when the session stream is unavailable",
    );
  }
  const writeSessionBlock =
    app.match(/const writeSession = \(line: string\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  if (writeSessionBlock.includes("appendLogText")) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: writeSession must not call appendLogText directly",
    );
  }

  if (/appendLogText\([^)]*password/s.test(app)) {
    failures.push("packages/c420ui/src/terminal/app.ts: sudo password must never be written to logs");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] launcher session logs OK");
  return 0;
}

  return { main };
})();

const checkInteractiveLogUiIntegrationContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  const cliDocs = read(rootDir, "docs/CLI.md");
  const technicalDocs = read(rootDir, "docs/TECHNICAL.md");
  const normalizedCliDocs = cliDocs.replace(/\s+/g, " ");
  const normalizedTechnicalDocs = technicalDocs.replace(/\s+/g, " ");

  if (!app.includes('screen.key(["f5"]')) {
    failures.push("packages/c420ui/src/terminal/app.ts: F5 log copy shortcut must remain available");
  }
  if (app.includes('screen.key(["f6"]') || app.includes("Plain Logs") || app.includes("plain logs")) {
    failures.push("packages/c420ui/src/terminal/app.ts: c420ui must not expose Plain Logs or bind F6 to plain logs mode");
  }
  if (!app.includes("terminalTextSelectionMode")) {
    failures.push("packages/c420ui/src/terminal/app.ts: terminal text selection mode is required");
  }
  if (!app.includes("type FocusZone") || !app.includes("FOCUS_ZONES")) {
    failures.push("packages/c420ui/src/terminal/app.ts: explicit FocusZone model is required");
  }
  if (!app.includes("function applyFocusStyles")) {
    failures.push("packages/c420ui/src/terminal/app.ts: active panel styling must be centralized");
  }
  if (
    !app.includes('screen.key(["tab"]') ||
    !app.includes('screen.key(["S-tab", "backtab"]')
  ) {
    failures.push("packages/c420ui/src/terminal/app.ts: Tab and Shift+Tab focus navigation are required");
  }
  if (!app.includes("if (!modalActive) {") || !app.includes("moveFocus")) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: modal dialogs must not leak Tab focus to the main c420ui",
    );
  }
  if (
    !app.includes("focusZone === \"menu\"") ||
    !app.includes("running || modalActive || focusZone !== \"menu\"")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: action execution must be blocked unless menu is focused and idle",
    );
  }
  if (!app.includes("activeCellBg") || !app.includes("activeCheckboxFg")) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: active cells and settings checkboxes must be visibly styled",
    );
  }
  if (
    !app.includes("terminalTextSelectionModeActive") ||
    !app.includes("let tuiMouseEnabled = !terminalTextSelectionModeActive")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: terminal selection mode must initialize mouse state before Blessed widgets are constructed",
    );
  }
  const mouseControlledWidgetCount =
    app.match(/mouse: tuiMouseEnabled/g)?.length ?? 0;
  if (mouseControlledWidgetCount < 4) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: terminal selection mode must disable c420ui mouse handling for menu, diagnostics, content and logs at startup",
    );
  }
  if (
    !app.includes("function applyProgramMouseMode") ||
    !app.includes("disableMouse") ||
    !app.includes("enableMouse")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: terminal selection mode must disable and restore screen program mouse handling",
    );
  }
  if (
    !app.includes("function applyGlobalMouseMode") ||
    !app.includes("function setWidgetMouseEnabled") ||
    !app.includes("for (const widget of [menu, diagnostics, generatedArtifacts, linuxArtifacts, content, logs])") ||
    !app.includes("footer.setContent(footerContent())")
  ) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: terminal selection mode must apply global mouse state to menu, diagnostics, content, logs and footer",
    );
  }
  if (!app.includes("Logs - Text selection mode enabled")) {
    failures.push(
      "packages/c420ui/src/terminal/app.ts: enabled terminal text selection mode must be visible in the logs label",
    );
  }
  for (const keyHandler of [
    'screen.key(["pageup"]',
    'screen.key(["pagedown"]',
    'screen.key(["home"]',
    'screen.key(["end"]',
  ]) {
    if (!app.includes(keyHandler)) {
      failures.push(
        "packages/c420ui/src/terminal/app.ts: keyboard log scrolling must remain available",
      );
    }
  }
  if (
    !(cliDocs.includes("terminal text selection") ||
      cliDocs.includes("Manual text selection")) ||
    !technicalDocs.includes("Terminal text selection mode") ||
    !normalizedCliDocs.includes("Changes take effect immediately") ||
    !normalizedTechnicalDocs.includes("Changes take effect immediately") ||
    normalizedCliDocs.includes("F6") ||
    normalizedTechnicalDocs.includes("F6") ||
    !normalizedTechnicalDocs.includes("keyboard navigation remains active") ||
    !normalizedTechnicalDocs
      .toLowerCase()
      .includes("some terminals may still require shift") ||
    !app.includes("Tab / Shift+Tab") ||
    !app.includes("Active panel") ||
    !app.includes("Active cell")
  ) {
    failures.push("docs: terminal text selection behavior must be documented");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] interactive log UI integration OK");
  return 0;
}

  return { main };
})();

function checkMetadataAndModalContracts(failures: string[]): void {
  const rootDir = findProjectRoot();
  const installNative = readProjectFile(rootDir, "scripts/install-native.sh");
  const buildAppImage = readProjectFile(rootDir, "scripts/build-appimage.sh");
  const buildFlatpakBundle = readProjectFile(rootDir, "scripts/build-flatpak-bundle.sh");
  const detectionCommon = readProjectFile(rootDir, "scripts/install-detection-common.sh");
  const modalTs = readProjectFile(rootDir, "packages/c420ui/src/terminal/modal.ts");

  if (!installNative.includes("sudo_install_build_metadata_marker") || !installNative.includes("install_build_metadata_marker")) {
    failures.push("scripts/install-native.sh: must install effective build metadata for Native hash-visible detection");
  }

  if (!buildAppImage.includes('write_build_metadata_sidecar "${APPIMAGE_PATH}"')) {
    failures.push("scripts/build-appimage.sh: must write ${APPIMAGE_PATH}.build-metadata.json");
  }

  if (!buildFlatpakBundle.includes('write_build_metadata_sidecar "${BUNDLE_PATH}"')) {
    failures.push("scripts/build-flatpak-bundle.sh: must write ${BUNDLE_PATH}.build-metadata.json");
  }

  if (!buildFlatpakBundle.includes("USE_EXISTING_REPO") ||
      !buildFlatpakBundle.includes("extract_flatpak_repo_build_metadata") ||
      !buildFlatpakBundle.includes("/files/share/canva-linux/version") ||
      !buildFlatpakBundle.includes("write_build_metadata_sidecar_from_source") ||
      !buildFlatpakBundle.includes("Could not read build metadata from reused repo")) {
    failures.push("scripts/build-flatpak-bundle.sh: must not use checkout metadata for --use-existing-repo sidecars and must extract it from repo");
  }

  if (!detectionCommon.includes("find_artifact_build_metadata_marker")) {
    failures.push("scripts/install-detection-common.sh: must prefer AppImage build-metadata sidecars over artifact filename parsing");
  }

  if (!modalTs.includes('input.on("cancel", () => {') || !modalTs.includes("setImmediate(() => {")) {
    failures.push("packages/c420ui/src/terminal/modal.ts: must defer textbox cancel close through setImmediate");
  }

  if (modalTs.includes('input.key(["escape"]')) {
    failures.push("packages/c420ui/src/terminal/modal.ts: must not register redundant input.key([\"escape\"]) handler");
  }
}

function checkAdapterContract(failures: string[]): void {
  runCheck(failures, { name: "adapter contract", run: checkAdapterContractRunner.main });
}

function checkRootProviderContract(failures: string[]): void {
  runCheck(failures, { name: "root provider contract", run: checkRootProviderContractRunner.main });
}

function checkSudoCommonContract(failures: string[]): void {
  runCheck(failures, { name: "c420ui sudo helper contract", run: checkC420UISudoHelperContractRunner.main });
}

function checkPublicBranding(failures: string[]): void {
  runCheck(failures, { name: "public branding", run: checkPublicBrandingContract.main });
}

function checkProjectBoundary(failures: string[]): void {
  runCheck(failures, { name: "project adapter boundary", run: checkProjectBoundaryContract.main });
}

function checkArtifactRecipes(failures: string[]): void {
  runCheck(failures, { name: "artifact recipes", run: checkArtifactRecipesContract.main });
}

function checkAppImageContract(failures: string[]): void {
  runCheck(failures, { name: "AppImage contract", run: checkAppImageContractRunner.main });
}

function checkFlatpakContract(failures: string[]): void {
  runCheck(failures, { name: "Flatpak contract", run: checkFlatpakContractRunner.main });
}

function checkReleaseArtifacts(failures: string[]): void {
  runCheck(failures, { name: "release artifacts", run: checkReleaseArtifactsContract.main });
}

function checkLauncherSessionLogs(failures: string[]): void {
  runCheck(failures, { name: "launcher session logs", run: checkLauncherSessionLogsContract.main });
}

function checkInteractiveLogUiIntegration(failures: string[]): void {
  runCheck(failures, { name: "interactive log UI integration", run: checkInteractiveLogUiIntegrationContract.main });
}


function checkNoParallelShellMenu(failures: string[]): void {
  const rootDir = findProjectRoot();

  for (const file of noParallelShellMenuActiveFiles) {
    const fullPath = path.join(rootDir, file.path);
    if (!fs.existsSync(fullPath)) continue;
    const state = { inBlockComment: false };
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const checkedLine = activeLine(line, file.kind, state);
      for (const pattern of noParallelShellMenuForbiddenPatterns) {
        if (checkedLine.includes(pattern)) {
          if (
            pattern === "CANVA_C420UI" &&
            (checkedLine.includes("CANVA_C420UI" + "_ROOT_AUTH") ||
              checkedLine.includes("CANVA_C420UI_TITLE"))
          ) {
            const sanitized = checkedLine
              .replace(new RegExp("CANVA_C420UI" + "_ROOT_AUTH", "g"), "")
              .replace(/CANVA_C420UI_TITLE/g, "");
            if (!sanitized.includes("CANVA_C420UI")) continue;
          }
          failures.push(
            `${file.path}:${index + 1}: forbidden shell-menu fragment: ${pattern}`,
          );
        }
      }
    });
  }
}

function checkNoRootLauncherContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const launcher = readProjectFile(rootDir, "scripts/c420ui-builder.ts");
  const runTui = readProjectFile(rootDir, "scripts/run-c420ui.ts");
  const adapterRun = readProjectFile(rootDir, "scripts/c420ui-adapter/run.ts");
  const rootMessage =
    "Do not run Canva Linux Builder powered by c420ui with sudo or as root.";

  if (!launcher.includes("process.getuid") || !launcher.includes("=== 0")) {
    failures.push("scripts/c420ui-builder.ts: must block uid 0 before launching Tool");
  }
  if (!launcher.includes(rootMessage) && !launcher.includes("Do not run ${BUILDER_TITLE} with sudo or as root.")) {
    failures.push("scripts/c420ui-builder.ts: must explain that root/sudo launch is blocked");
  }
  if (!launcher.includes("administrator privileges")) {
    failures.push(
      "scripts/c420ui-builder.ts: root guard must explain privileges are requested only when needed",
    );
  }
  const adapter = readProjectFile(rootDir, "scripts/c420ui-adapter/adapter.ts");
  if (!runTui.includes("runCanvaLinuxC420UI")) {
    failures.push("scripts/run-c420ui.ts must call runCanvaLinuxC420UI");
  }
  if (runTui.includes(".build/packages/c420ui/terminal/index.js")) {
    failures.push("scripts/run-c420ui.ts must not execute the c420ui terminal barrel bundle");
  }
  if (runTui.includes("process.getuid")) {
    failures.push("scripts/run-c420ui.ts must not perform root launch checks");
  }
  if (!adapterRun.includes("runC420UITerminalApp")) {
    failures.push("scripts/c420ui-adapter/run.ts must import runC420UITerminalApp");
  }
  if (!adapterRun.includes("../../packages/c420ui/src/terminal")) {
    failures.push("scripts/c420ui-adapter/run.ts must import terminal UI from packages/c420ui/src/terminal");
  }
  if (adapterRun.includes("process.getuid")) {
    failures.push("scripts/c420ui-adapter/run.ts must not perform root launch checks");
  }
  if (adapterRun.includes("process.exit")) {
    failures.push("scripts/c420ui-adapter/run.ts must not own root guard exits");
  }
  if (adapter.includes("rootLaunchGuardMessage")) {
    failures.push("scripts/c420ui-adapter/adapter.ts must not expose rootLaunchGuardMessage");
  }

  const docsToCheck = ["README.md", "docs/CLI.md", "docs/TECHNICAL.md"];
  for (const relativePath of docsToCheck) {
    const content = readProjectFile(rootDir, relativePath);
    if (/sudo\s+\.\/canva-linux-c420ui-builder/.test(content)) {
      failures.push(
        `${relativePath}: must not instruct users to run ./canva-linux-c420ui-builder with sudo`,
      );
    }
  }
}


function checkCanvaLinuxConfigBoundary(failures: string[]): void {
  const rootDir = findProjectRoot();
  const requiredFiles = [
    "config/canva-linux/actions.json",
    "config/canva-linux/project-ui.json",
    "scripts/canva-linux/actions/registry.ts",
  ] as const;
  const removedFiles = [
    "scripts/actions.json",
    "scripts/project-ui.json",
    "scripts/core/action-registry.ts",
    "scripts/core/validate-actions.ts",
  ] as const;

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, file))) failures.push(`${file}: required config boundary file is missing`);
  }
  for (const file of removedFiles) {
    if (fs.existsSync(path.join(rootDir, file))) failures.push(`${file}: removed config boundary file must not exist`);
  }
}

function checkActionRegistryContract(failures: string[]): void {
  const actions = loadCanvaLinuxActions(findProjectRoot());
  const aliases = new Map<string, string>();

  for (const action of actions) {
    if (action.scope === "system" && action.requiresRoot !== true) {
      failures.push(`${action.id}: system-scope actions must set requiresRoot=true`);
    }
    if (action.scope === "user" && action.requiresRoot === true) {
      failures.push(`${action.id}: user-scope actions must not require root`);
    }
    if (action.scope) {
      const expected = expectedEnvFor(action.id, action.scope);
      if (expected) {
        const [key, value] = expected;
        if (action.env?.[key] !== value) {
          failures.push(`${action.id}: expected env ${key}=${value}`);
        }
      }
    }
    const expectedInstallDetectionKey = expectedInstallDetectionKeyFor(action.id);
    if (expectedInstallDetectionKey && action.installDetectionKey !== expectedInstallDetectionKey) {
      failures.push(`${action.id}: expected installDetectionKey=${expectedInstallDetectionKey}`);
    }
    if (action.dangerous && !(action.confirmationTitle || action.confirmationMessage)) {
      failures.push(
        `${action.id}: dangerous actions must include confirmation metadata`,
      );
    }
    if (
      (action.kind === "planned" || action.planned) &&
      (("command" in action && action.command) || ("args" in action && action.args))
    ) {
      failures.push(`${action.id}: planned actions must not define command/args`);
    }
    for (const alias of action.cli ?? []) {
      const existing = aliases.get(alias);
      if (existing) {
        failures.push(
          `${action.id}: duplicate CLI alias ${alias} already used by ${existing}`,
        );
      }
      aliases.set(alias, action.id);
    }
  }
}



function checkC420UIAdapterBoundary(rootDir: string, failures: string[]): void {
  const boundaryMessage = "c420ui integration modules must live under scripts/c420ui-adapter, not scripts/canva-linux.";
  for (const forbiddenPath of [
    "scripts/canva-linux/detection",
    "scripts/canva-linux/bootstrap",
    "scripts/canva-linux/build-metadata-loader.ts",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
      failures.push(`${forbiddenPath}: ${boundaryMessage}`);
    }
  }

  const sourceFiles = collectProjectFiles(rootDir, ["scripts", "test", "packages/c420ui/src"]);
  for (const relativePath of sourceFiles) {
    if (relativePath === "scripts/checks/canva-linux/check-canva-linux-contracts.ts") continue;
    const contents = readProjectFile(rootDir, relativePath);
    for (const forbiddenImport of [
      "../canva-linux/detection/provider",
      "./canva-linux/detection/provider",
      "./canva-linux/build-metadata-loader",
      "./canva-linux/bootstrap/build-recipe",
      "./canva-linux/bootstrap/source-hash",
      "../scripts/canva-linux/detection/artifact-fragments",
      "../scripts/canva-linux/detection/provider",
      "../scripts/canva-linux/bootstrap/build-recipe",
      "../scripts/canva-linux/bootstrap/source-hash",
    ] as const) {
      if (contents.includes(forbiddenImport)) {
        failures.push(`${relativePath}: ${boundaryMessage}`);
      }
    }
  }

  const adapterSource = readProjectFile(rootDir, "scripts/c420ui-adapter/adapter.ts");
  const bootstrapSource = readProjectFile(rootDir, "scripts/build-c420ui-bootstrap.ts");
  if (!adapterSource.includes('./detection/provider')) {
    failures.push("scripts/c420ui-adapter/adapter.ts: must import ./detection/provider");
  }
  if (!bootstrapSource.includes('./c420ui-adapter/build-metadata-loader')) {
    failures.push("scripts/build-c420ui-bootstrap.ts: must import ./c420ui-adapter/build-metadata-loader");
  }
  if (!bootstrapSource.includes('./c420ui-adapter/bootstrap/build-recipe')) {
    failures.push("scripts/build-c420ui-bootstrap.ts: must import ./c420ui-adapter/bootstrap/build-recipe");
  }
  if (!bootstrapSource.includes('./c420ui-adapter/bootstrap/source-hash')) {
    failures.push("scripts/build-c420ui-bootstrap.ts: must import ./c420ui-adapter/bootstrap/source-hash");
  }

  const sourceHash = readProjectFile(rootDir, "scripts/c420ui-adapter/bootstrap/source-hash.ts");
  for (const requiredInput of [
    "scripts/canva-linux/actions",
    "scripts/canva-linux/artifacts",
    "scripts/canva-linux/capabilities",
    "scripts/canva-linux/development",
    "scripts/canva-linux/project-root.ts",
  ] as const) {
    if (!sourceHash.includes(requiredInput)) {
      failures.push(`scripts/c420ui-adapter/bootstrap/source-hash.ts: source hash must include remaining bundled dependency ${requiredInput}`);
    }
  }
  for (const forbiddenInput of [
    "scripts/canva-linux/detection",
    "scripts/canva-linux/bootstrap",
    "scripts/canva-linux/build-metadata-loader.ts",
  ] as const) {
    if (sourceHash.includes(forbiddenInput)) {
      failures.push(`scripts/c420ui-adapter/bootstrap/source-hash.ts: source hash must not include removed c420ui integration module ${forbiddenInput}`);
    }
  }

  const artifactFragments = readProjectFile(rootDir, "scripts/c420ui-adapter/detection/artifact-fragments.ts");
  if (!artifactFragments.includes("Intl.Collator") || !artifactFragments.includes("numeric: true")) {
    failures.push("scripts/c420ui-adapter/detection/artifact-fragments.ts: artifact candidate sorting must be numeric-aware.");
  }
  if (artifactFragments.includes("return candidates.sort();")) {
    failures.push("scripts/c420ui-adapter/detection/artifact-fragments.ts: must not use lexicographic candidates.sort().");
  }
  if (!/typeof workflow\.outputPattern !== "string"[\s\S]*detected: false[\s\S]*continue;/.test(artifactFragments)) {
    failures.push("scripts/c420ui-adapter/detection/artifact-fragments.ts: workflows without outputPattern must be emitted as detected: false.");
  }

  const terminalSummary = readProjectFile(rootDir, "packages/c420ui/src/terminal/detected-installations-summary.ts");
  for (const forbiddenLabel of ["Native Install", "Flatpak Install"] as const) {
    if (terminalSummary.includes(forbiddenLabel)) {
      failures.push(`packages/c420ui/src/terminal/detected-installations-summary.ts: loading state must not use ${forbiddenLabel}`);
    }
  }
}

function checkDetectionProviderContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const providerPath = "scripts/c420ui-adapter/detection/provider.ts";
  const rootProviderPath = "scripts/c420ui-adapter/root-provider.ts";
  const packageJsonPath = "package.json";

  if (!fs.existsSync(path.join(rootDir, providerPath))) {
    failures.push(`${providerPath} must exist`);
    return;
  }

  const provider = readProjectFile(rootDir, providerPath);
  const rootProvider = readProjectFile(rootDir, rootProviderPath);
  const packageJson = readProjectFile(rootDir, packageJsonPath);
  const artifactFragmentsPath = "scripts/c420ui-adapter/detection/artifact-fragments.ts";
  const artifactFragments = readProjectFile(rootDir, artifactFragmentsPath);


  for (const fragment of [
    "createCanvaLinuxDetectionProvider",
    "buildCanvaLinuxOverviewStatus",
    "scripts/install-detection-common.sh",
    "parseC420UIDetectionKeyValueLines",
    "DETECTED_NATIVE_SYSTEM",
    "DETECTED_FLATPAK_SYSTEM_FULL_VERSION",
    "artifactFragments",
    "buildCanvaLinuxArtifactFragments(rootDir)",
    "io.github.coletivo420.canva-linux",
    "canva-linux",
    "https://github.com/coletivo420/canva-linux",
  ]) {
    if (!provider.includes(fragment)) {
      failures.push(`${providerPath}: missing ${fragment}`);
    }
  }


  if (!artifactFragments.includes("config/canva-linux/artifacts.json")) {
    failures.push("Artifact fragment detection must be registry-driven from config/canva-linux/artifacts.json.");
  }
  for (const required of ["*.flatpak", "linux-unpacked", "*.tar.gz", "SHA256SUMS", ".deb", ".rpm", "PKGBUILD", "*.pkg.tar.*"]) {
    if (!artifactFragments.includes(required)) {
      failures.push("Artifact fragment detection must not be limited to AppImage.");
      break;
    }
  }


  for (const fragment of [
    "package:" + " project",
    "as c420uiOverviewStatus & { package:",
  ]) {
    if (provider.includes(fragment)) {
      failures.push(`${providerPath}: must not restore legacy overview compatibility shape`);
    }
  }

  if (!rootProvider.includes('./detection/provider')) {
    failures.push(`${rootProviderPath}: must import the Canva Linux detection provider`);
  }
  if (rootProvider.includes('../core/overview-status')) {
    failures.push(`${rootProviderPath}: must not import ../core/overview-status`);
  }
  if (fs.existsSync(path.join(rootDir, "scripts/core/overview-status.ts"))) {
    failures.push("scripts/core/overview-status.ts must not exist");
  }
  if (packageJson.includes("scripts/core/overview-status.ts")) {
    failures.push("package.json build:scripts-core must not compile overview-status.ts");
  }

  const detectionShellPath = "scripts/install-detection-common.sh";
  const detectionShell = readProjectFile(rootDir, detectionShellPath);
  if (!detectionShell.includes("DETECTED_FLATPAK_SYSTEM_FULL_VERSION")) {
    failures.push(`${detectionShellPath}: must print DETECTED_FLATPAK_SYSTEM_FULL_VERSION`);
  }

  const terminalSummaryPath = "packages/c420ui/src/terminal/detected-installations-summary.ts";
  const terminalSummary = readProjectFile(rootDir, terminalSummaryPath);

  if (!terminalSummary.includes("artifactFragments") || !terminalSummary.includes("Generated Artifacts")) {
    failures.push("c420ui summary must render Generated Artifacts from artifactFragments.");
  }
  if (!terminalSummary.includes("appImageArtifacts") || !terminalSummary.includes("appImageFullVersion")) {
    failures.push(`${terminalSummaryPath}: legacy appImageArtifacts fallback must remain supported`);
  }
  const fullIndex = terminalSummary.indexOf("flatpakSystemFullVersion");
  const baseIndex = terminalSummary.indexOf("flatpakSystemVersion");
  if (fullIndex === -1 || baseIndex === -1 || fullIndex > baseIndex) {
    failures.push(`${terminalSummaryPath}: must prefer flatpakSystemFullVersion before flatpakSystemVersion`);
  }
  const terminalApp = readProjectFile(rootDir, "packages/c420ui/src/terminal/app.ts");
  if (!terminalApp.includes("formatDetectionPanelSummaries")) {
    failures.push("packages/c420ui/src/terminal/app.ts: must render Detected Installations through the shared formatter");
  }

  const validationDocs = readProjectFile(rootDir, "docs/VALIDATION.md");
  if (!validationDocs.includes("Detected Installations") || !validationDocs.includes("effective/hashed")) {
    failures.push("docs/VALIDATION.md: must document Detected Installations effective/hashed version preference");
  }
}

function checkInstallationDetectionContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const raw = JSON.stringify(buildCanvaLinuxOverviewStatus(rootDir));

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    failures.push(
      `overview-status stdout is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  const project = parsed.project;
  if (!project || typeof project !== "object") {
    failures.push("overview status missing project object");
  }
  for (const field of ["version", "phase", "appId", "executable"]) {
    if (typeof project?.[field] !== "string") {
      failures.push(`overview status project.${field} must be string`);
    }
  }
  if (!parsed.installations || typeof parsed.installations !== "object") {
    failures.push("overview-status missing installations object");
  }
  for (const field of detectionBooleanFields) {
    if (typeof parsed.installations?.[field] !== "boolean") {
      failures.push(`overview-status installations.${field} must be boolean`);
    }
  }
  for (const field of detectionVersionFields) {
    if (typeof parsed.installations?.[field] !== "string") {
      failures.push(`overview-status installations.${field} must be string`);
    }
  }
}

function checkVersionConsistency(failures: string[]): void {
  const rootDir = findProjectRoot();
  const pkg = JSON.parse(readProjectFile(rootDir, "package.json")) as { version?: string };
  const projectUi = JSON.parse(readProjectFile(rootDir, "config/canva-linux/project-ui.json")) as {
    displayVersion?: string;
    phase?: string;
  };
  const identity = readProjectFile(rootDir, "scripts/app-identity-common.sh");
  const phaseMatch = identity.match(/^PROJECT_PHASE="([^"]+)"/m);
  const displayVersionMatch = identity.match(/^PROJECT_DISPLAY_VERSION="([^"]+)"/m);
  if (!pkg.version) {
    failures.push("package.json version not found");
    return;
  }
  if (!phaseMatch) failures.push("PROJECT_PHASE not found");
  if (!displayVersionMatch) failures.push("PROJECT_DISPLAY_VERSION not found");
  if (!phaseMatch || !displayVersionMatch) return;

  const expectedPhase = expectedPhaseFromVersion(pkg.version);
  const expectedDisplayVersion = expectedDisplayVersionFromVersion(pkg.version);
  if (phaseMatch[1] !== expectedPhase) {
    failures.push(`PROJECT_PHASE mismatch: expected ${expectedPhase}, got ${phaseMatch[1]}`);
  }
  if (displayVersionMatch[1] !== expectedDisplayVersion) {
    failures.push(
      `PROJECT_DISPLAY_VERSION mismatch: expected ${expectedDisplayVersion}, got ${displayVersionMatch[1]}`,
    );
  }
  if (projectUi.phase !== expectedPhase) {
    failures.push(
      `project-ui phase mismatch: expected ${expectedPhase}, got ${projectUi.phase || "missing"}`,
    );
  }
  if (projectUi.displayVersion !== expectedDisplayVersion) {
    failures.push(
      `project-ui displayVersion mismatch: expected ${expectedDisplayVersion}, got ${projectUi.displayVersion || "missing"}`,
    );
  }
}

function checkReleaseContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const workflowPath = ".github/workflows/release.yml";
  const releaseDocsPath = "docs/RELEASE.md";
  const workflow = fs.existsSync(path.join(rootDir, workflowPath))
    ? readProjectFile(rootDir, workflowPath)
    : "";
  const releaseDocs = fs.existsSync(path.join(rootDir, releaseDocsPath))
    ? readProjectFile(rootDir, releaseDocsPath)
    : "";
  const pkg = JSON.parse(readProjectFile(rootDir, "package.json")) as { version?: string };
  const releaseVersion = pkg.version || "";

  if (!workflow) failures.push(`${workflowPath}: missing release workflow`);
  if (!releaseDocs) failures.push(`${releaseDocsPath}: missing release notes body`);
  if (workflow.includes("\t")) failures.push(`${workflowPath}: tabs are forbidden`);
  if (workflow.includes("find dist") || workflow.includes("head -n 1")) {
    failures.push(`${workflowPath}: asset selection must not use find/head`);
  }
  if (workflow.includes("_source=") || workflow.includes("_target=")) {
    failures.push(
      `${workflowPath}: release artifact paths must not use dead source/target rename variables`,
    );
  }

  if (!releaseVersion) failures.push("package.json: missing version");

  for (const expected of [
    "workflow_dispatch:",
    "tags:",
    'node-version: "22"',
    "npm run validate:project",
    "shell_display_version",
    "shell_phase",
    "PROJECT_DISPLAY_VERSION",
    "PROJECT_PHASE",
    "./scripts/build-appimage.sh",
    "./scripts/build-flatpak-bundle.sh",
    "appimage_paths=(dist/canva-linux-${RELEASE_VERSION}-*.AppImage)",
    "flatpak_paths=(dist/canva-linux-${RELEASE_VERSION}-*.flatpak)",
    'linux_arch="$(uname -m)"',
    'tarball_path="dist/canva-linux-${RELEASE_VERSION}-linux-unpacked-${linux_arch}.tar.gz"',
    'sha256sum "${release_assets[@]}" > SHA256SUMS',
    "dist/SHA256SUMS",
    "softprops/action-gh-release@v2",
    "body_path: docs/RELEASE.md",
    "dist/canva-linux-${{ env.RELEASE_VERSION }}-*.AppImage",
    "dist/canva-linux-${{ env.RELEASE_VERSION }}-*.flatpak",
    "dist/canva-linux-${{ env.RELEASE_VERSION }}-linux-unpacked-*.tar.gz",
  ]) {
    assertIncludes(failures, workflowPath, workflow, expected);
  }

  for (const expected of [
    `canva-linux-${releaseVersion}-x86_64.AppImage`,
    `canva-linux-${releaseVersion}-x86_64.flatpak`,
    `canva-linux-${releaseVersion}-linux-unpacked-x86_64.tar.gz`,
    "preserve upstream/tooling architecture strings",
    "real generated file names",
    "SHA256SUMS",
  ]) {
    assertIncludes(failures, releaseDocsPath, releaseDocs, expected);
  }

  const releaseNamingText = `${workflow}\n${releaseDocs}`;
  const dottedVersionMatch = releaseNamingText.match(/\b(?:v|canva-linux-)\d+\.\d+\.\d+\.\d+\b/);
  if (dottedVersionMatch) {
    failures.push(
      `release naming must use npm-compatible versions, found dotted version ${dottedVersionMatch[0]}`,
    );
  }

  const releaseValidationText = [
    workflow,
    releaseDocs,
    readProjectFile(rootDir, "scripts/build-appimage.sh"),
    readProjectFile(rootDir, "scripts/build-flatpak-bundle.sh"),
    readProjectFile(rootDir, "scripts/package-guidance-common.sh"),
    readProjectFile(rootDir, "config/canva-linux/artifacts.json"),
  ].join("\n");

  for (const forbidden of [
    "linux-unpacked-x64",
    "-x64.AppImage",
    "-x64.flatpak",
    "ARCH=x64",
    'ARCH="x64"',
  ]) {
    if (releaseValidationText.includes(forbidden)) {
      failures.push(
        `release naming must preserve generated architecture names, found ${forbidden}`,
      );
    }
  }

  for (const script of releaseScripts) {
    validateReleaseShellScript(rootDir, script, failures);
  }

  const buildAppImage = readProjectFile(rootDir, "scripts/build-appimage.sh");
  if (
    buildAppImage.includes("APPIMAGE_ARCH=") ||
    buildAppImage.includes("-x86_64.AppImage") ||
    buildAppImage.includes("-X86_64.AppImage")
  ) {
    failures.push(
      "scripts/build-appimage.sh: AppImage architecture must be discovered from the generated artifact name",
    );
  }
  assertIncludes(failures, "scripts/build-appimage.sh", buildAppImage, "appimage_candidates=(");
  assertIncludes(failures, "scripts/build-appimage.sh", buildAppImage, 'basename "${APPIMAGE_PATH}"');

  const buildFlatpakBundle = readProjectFile(rootDir, "scripts/build-flatpak-bundle.sh");
  assertIncludes(
    failures,
    "scripts/build-flatpak-bundle.sh",
    buildFlatpakBundle,
    'FLATPAK_ARCH="$(flatpak --default-arch)"',
  );
  assertIncludes(
    failures,
    "scripts/build-flatpak-bundle.sh",
    buildFlatpakBundle,
    "canva-linux-${VERSION}-${FLATPAK_ARCH}.flatpak",
  );

  if (buildAppImage.includes("> SHA256SUMS") || buildAppImage.includes("/SHA256SUMS")) {
    failures.push(
      "scripts/build-appimage.sh: AppImage build must not create or remove the complete release SHA256SUMS manifest",
    );
  }
  assertIncludes(failures, "scripts/build-appimage.sh", buildAppImage, ".AppImage.sha256");
  assertIncludes(failures, "scripts/build-appimage.sh", buildAppImage, "--skip-release-manifest");

  const lock = JSON.parse(readProjectFile(rootDir, "package-lock.json")) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };
  const projectUi = JSON.parse(readProjectFile(rootDir, "config/canva-linux/project-ui.json")) as {
    displayVersion?: string;
    phase?: string;
  };
  const identity = readProjectFile(rootDir, "scripts/app-identity-common.sh");
  const displayVersion = shellValue(identity, "PROJECT_DISPLAY_VERSION");
  const phase = shellValue(identity, "PROJECT_PHASE");

  if (!pkg.version) failures.push("package.json: missing version");
  if (pkg.version && pkg.version !== currentReleaseVersion) {
    failures.push(`package.json: version must be ${currentReleaseVersion}`);
  }
  if (pkg.version && !releaseVersionPattern.test(pkg.version)) {
    failures.push("package.json: version must follow N.N.N-X or N.N.N-X.Dev.Y release versioning");
  }
  if (pkg.version && forbiddenCurrentReleaseVersions.includes(pkg.version)) {
    failures.push(`package.json: forbidden release version ${pkg.version}`);
  }
  if (lock.version !== currentReleaseVersion) {
    failures.push(`package-lock.json: top-level version must be ${currentReleaseVersion}`);
  }
  if (lock.packages?.[""]?.version !== currentReleaseVersion) {
    failures.push(`package-lock.json: root package version must be ${currentReleaseVersion}`);
  }
  const appstreamPath = "data/io.github.coletivo420.canva-linux.metainfo.xml";
  const appstream = readOptionalProjectFile(rootDir, appstreamPath);
  const expectedReleaseTag = `<release version="${currentReleaseVersion}" date="${currentReleaseDate}">`;
  if (appstream === undefined) {
    failures.push(`${appstreamPath}: AppStream metadata file not found`);
  } else if (!currentReleaseVersion.includes(".Dev.") && !appstream.includes(expectedReleaseTag)) {
    failures.push(`AppStream metadata must contain release entry: ${expectedReleaseTag}`);
  }
  for (const forbidden of forbiddenCurrentReleaseVersions) {
    const filesWithForbidden = [
      "package.json",
      "package-lock.json",
      "README.md",
      "docs/RELEASE.md",
    ].filter((relativePath) =>
      readOptionalProjectFile(rootDir, relativePath)?.includes(forbidden) ?? false,
    );
    if (filesWithForbidden.length) {
      failures.push(`forbidden release identity ${forbidden} found in ${filesWithForbidden.join(", ")}`);
    }
  }
  for (const relativePath of activePublicReleaseDocs) {
    const contents = readOptionalProjectFile(rootDir, relativePath);
    if (contents === undefined) {
      failures.push(`${relativePath}: file not found during version check`);
    } else if (contents.includes(previousReleaseVersion)) {
      failures.push(`${relativePath}: active public docs must not reference ${previousReleaseVersion}`);
    }
  }
  if (pkg.version && lock.version !== pkg.version) {
    failures.push("package-lock.json: top-level version must match package.json");
  }
  if (pkg.version && lock.packages?.[""]?.version !== pkg.version) {
    failures.push("package-lock.json: root package version must match package.json");
  }

  if (pkg.version) {
    const expectedPhase = expectedPhaseFromVersion(pkg.version);
    const expectedDisplayVersion = expectedDisplayVersionFromVersion(pkg.version);
    if (projectUi.displayVersion !== expectedDisplayVersion) {
      failures.push(`config/canva-linux/project-ui.json: displayVersion must be ${expectedDisplayVersion}`);
    }
    if (projectUi.phase !== expectedPhase) {
      failures.push(`config/canva-linux/project-ui.json: phase must be ${expectedPhase}`);
    }
    if (displayVersion !== expectedDisplayVersion) {
      failures.push(
        `scripts/app-identity-common.sh: PROJECT_DISPLAY_VERSION must be ${expectedDisplayVersion}`,
      );
    }
    if (phase !== expectedPhase) {
      failures.push(`scripts/app-identity-common.sh: PROJECT_PHASE must be ${expectedPhase}`);
    }
  }
}

function checkDevelopmentTaskRecipes(failures: string[]): void {
  const rootDir = findProjectRoot();
  const developmentPath = "config/canva-linux/development.json";
  const actionsPath = "config/canva-linux/actions.json";
  if (!fs.existsSync(path.join(rootDir, developmentPath))) {
    failures.push(`${developmentPath}: missing development recipe config`);
    return;
  }

  const config = JSON.parse(readProjectFile(rootDir, developmentPath)) as {
    tasks?: Array<{
      id?: string;
      kind?: string;
      actionId?: string;
      requiresRoot?: boolean;
      supportsDryRun?: boolean;
      planned?: boolean;
    }>;
  };
  const actions = loadCanvaLinuxActions(rootDir);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const tasks = config.tasks ?? [];
  if (!Array.isArray(config.tasks)) {
    failures.push(`${developmentPath}: tasks must be an array`);
    return;
  }

  const requiredKinds = new Set(["doctor", "validate", "build", "package", "release"]);
  for (const task of tasks) {
    if (!task.id || !task.actionId) continue;
    if (task.kind) requiredKinds.delete(task.kind);
    const action = actionsById.get(task.actionId);
    if (!action) {
      failures.push(`${developmentPath}: task ${task.id} references unknown actionId ${task.actionId}`);
      continue;
    }
    const actionPlanned = action.kind === "planned" || action.planned === true;
    if (actionPlanned && task.planned !== true) {
      failures.push(`${developmentPath}: task ${task.id} references planned action ${task.actionId} without planned=true`);
    }
    if (task.requiresRoot !== undefined && Boolean(task.requiresRoot) !== Boolean(action.requiresRoot)) {
      failures.push(`${developmentPath}: task ${task.id} requiresRoot contradicts action ${task.actionId}`);
    }
    if ((task as { scope?: string }).scope !== undefined && (task as { scope?: string }).scope !== action.scope) {
      failures.push(`${developmentPath}: task ${task.id} scope contradicts action ${task.actionId}`);
    }
    if (task.supportsDryRun === true && action.kind !== "command") {
      failures.push(`${developmentPath}: task ${task.id} promises dry-run for non-command action ${task.actionId}`);
    }
  }
  if (requiredKinds.size) {
    failures.push(`${developmentPath}: missing required development task kinds ${[...requiredKinds].join(", ")}`);
  }
  if (!fs.existsSync(path.join(rootDir, actionsPath))) {
    failures.push(`${actionsPath}: actions registry is required for development recipes`);
  }
}


function summarizeSpawnFailure(result: ReturnType<typeof spawnSync>): string {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}

function validateC420uiBundleSyntax(rootDir: string, relativePath: string, failures: string[]): void {
  const result = spawnSync(process.execPath, ["--check", relativePath], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    failures.push(`${relativePath}: c420ui bootstrap bundle failed syntax validation. Regenerate bootstrap from TypeScript sources. (${summarizeSpawnFailure(result)})`);
  }
}

function validateC420uiRunBundleStructuralIntegrity(rootDir: string, failures: string[]): void {
  const relativePath = "bootstrap/c420ui/run-c420ui.cjs";
  const bundle = readOptionalProjectFile(rootDir, relativePath) ?? "";
  const malformedSigcontClosure = /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/.test(bundle);
  const programStart = bundle.indexOf("var require_program = __commonJS");
  const programEnd = bundle.indexOf("var require_tput =", programStart);
  const programFallbackEnd = bundle.indexOf("var require_tng =", programStart);
  const programBlock =
    programStart === -1
      ? ""
      : bundle.slice(
          programStart,
          programEnd > programStart
            ? programEnd
            : programFallbackEnd > programStart
              ? programFallbackEnd
              : undefined,
        );
  const inputDialogStart = bundle.indexOf("function inputDialog(");
  const inputDialogEnd = bundle.indexOf("function confirmDialog(", inputDialogStart);
  const modalModuleEnd = bundle.indexOf("var init_modal", inputDialogStart);
  const inputDialogBlock =
    inputDialogStart === -1
      ? ""
      : bundle.slice(
          inputDialogStart,
          inputDialogEnd > inputDialogStart
            ? inputDialogEnd
            : modalModuleEnd > inputDialogStart
              ? modalModuleEnd
              : undefined,
        );
  const runnerStart = bundle.indexOf("function createInteractiveActionRunner(options) {");
  const runnerEnd = bundle.indexOf("var init_interactive_action_runner", runnerStart);
  const runnerBlock = runnerStart === -1 || runnerEnd === -1 ? "" : bundle.slice(runnerStart, runnerEnd);
  const actionRunnerOptionsStart = bundle.indexOf("const actionRunner = createInteractiveActionRunner({");
  const actionRunnerOptionsEnd = bundle.indexOf("let progressState", actionRunnerOptionsStart);
  const actionRunnerOptionsBlock =
    actionRunnerOptionsStart === -1 || actionRunnerOptionsEnd === -1
      ? ""
      : bundle.slice(actionRunnerOptionsStart, actionRunnerOptionsEnd);
  const validatorsInRunner = /function assertOptional(?:Boolean|String|StringArray|PurposeArray)\b/.test(runnerBlock);
  const validatorsNearRunnerState = /(?:createInteractiveActionRunner|runAction|cancel|options\.appendLogText|state\.progressState)[\s\S]{0,2000}function assertOptional(?:Boolean|String|StringArray|PurposeArray)\b/.test(runnerBlock);

  if (programBlock.includes("function artifactVersion") || programBlock.includes("scripts/c420ui-adapter/detection/artifact-fragments")) {
    failures.push(`${relativePath}: c420ui summary/detection code was interleaved into blessed Program bundle section.`);
  }
  if (inputDialogBlock.includes("function artifactVersion") || inputDialogBlock.includes("formatDetectionPanelSummaries")) {
    failures.push(`${relativePath}: detected-installations summary code was interleaved into inputDialog.`);
  }
  if (runnerStart === -1 || runnerEnd === -1) {
    failures.push(`${relativePath}: missing interactive action runner boundaries; regenerate bootstrap from TypeScript sources`);
  }
  if (malformedSigcontClosure || validatorsInRunner || validatorsNearRunnerState) {
    failures.push(`${relativePath} appears structurally corrupted: host-dependency validators were interleaved into the interactive action runner. Regenerate bootstrap from TypeScript sources.`);
  }
  if (actionRunnerOptionsBlock.includes("function loadC420UITerminalApp(")) {
    failures.push(`${relativePath}: terminal app loader was interleaved into createApp appendLogText section.`);
  }
}

function checkC420uiGeneratedArtifactsContract(rootDir: string, failures: string[]): void {
  const artifacts = [
    "bootstrap/c420ui/run-c420ui.cjs",
    "bootstrap/c420ui/run-c420ui-cli.cjs",
    "bootstrap/c420ui/c420ui-builder.cjs",
  ] as const;

  for (const artifact of artifacts) {
    const absolutePath = path.join(rootDir, artifact);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${artifact}: generated c420ui bootstrap artifact must exist`);
      continue;
    }
    const source = readProjectFile(rootDir, artifact);
    if (!source.includes("// scripts/") && !source.includes("// packages/c420ui/src")) {
      failures.push(`${artifact}: generated bootstrap bundle must retain esbuild source-section comments`);
    }
    validateC420uiBundleSyntax(rootDir, artifact, failures);
  }

  validateC420uiRunBundleStructuralIntegrity(rootDir, failures);

  const bootstrapCheck = readProjectFile(rootDir, "scripts/checks/canva-linux/check-c420ui-bootstrap.ts");
  for (const required of [
    "C420UI_RUNTIME_SYNTAX_MESSAGE",
    "validateGeneratedArtifactsMatchBuildRecipe",
    "C420UI_GENERATED_ARTIFACTS_STALE_MESSAGE",
    "validateC420UIRuntimeBundleKnownCorruption",
    "assertOptional(?:Boolean|String|StringArray|PurposeArray)",
    "codePointAt polyfill must define var size = string.length before size is used",
  ] as const) {
    if (!bootstrapCheck.includes(required)) {
      failures.push(`scripts/checks/canva-linux/check-c420ui-bootstrap.ts: missing generated-artifact guard ${required}`);
    }
  }

  for (const forbiddenPath of ["canva-linux" + ".sh", "bootstrap/c420ui/" + "canva-linux-c420ui-builder.cjs"] as const) {
    if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
      failures.push(`${forbiddenPath}: must not be restored as a c420ui bootstrap fallback`);
    }
  }

  const guardrails = readOptionalProjectFile(rootDir, "docs/internal/AI_GUARDRAILS.md") ?? "";
  const validationDocs = readOptionalProjectFile(rootDir, "docs/VALIDATION.md") ?? "";
  const review = readOptionalProjectFile(rootDir, "REVIEW.md") ?? "";
  const changelog = readOptionalProjectFile(rootDir, "CHANGELOG.md") ?? "";
  const generatedRule = "bootstrap/c420ui/*.cjs are generated artifacts. Do not edit them manually.";
  const sourceRule = "Any behavioral change must be made in TypeScript sources and then propagated through npm run build:c420ui-bootstrap.";
  for (const [relativePath, contents] of [
    ["docs/internal/AI_GUARDRAILS.md", guardrails],
    ["docs/VALIDATION.md", validationDocs],
    ["REVIEW.md", review],
    ["CHANGELOG.md", changelog],
  ] as const) {
    if (!contents.includes(generatedRule) || !contents.includes(sourceRule)) {
      failures.push(`${relativePath}: must document TypeScript-first c420ui bootstrap artifact maintenance`);
    }
  }
}

function checkC420uiArtifactGateContract(rootDir: string, failures: string[]): void {
  const packageJsonSource = readProjectFile(rootDir, "package.json");
  const packageJson = JSON.parse(packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const nodeCheckScript = scripts["check:c420ui-node-check"] ?? "";
  const artifactGateScript = scripts["check:c420ui-bootstrap-artifacts"] ?? "";
  const validateProjectScript = scripts["validate:project"] ?? "";
  const validateProject = readProjectFile(rootDir, "scripts/validate-project.sh");
  const adapterSource = readProjectFile(rootDir, "scripts/c420ui-adapter/adapter.ts");

  if (!nodeCheckScript) {
    failures.push("package.json must contain check:c420ui-node-check");
  }
  if (!nodeCheckScript.includes("check-c420ui-node-check.js")) {
    failures.push("check:c420ui-node-check must run check-c420ui-node-check.js");
  }
  if (!artifactGateScript) {
    failures.push("package.json must contain check:c420ui-bootstrap-artifacts");
  }
  if (!artifactGateScript.includes("check-c420ui-artifact-gate.js")) {
    failures.push("check:c420ui-bootstrap-artifacts must run check-c420ui-artifact-gate.js");
  }
  if (artifactGateScript.includes("npm run build:metadata")) {
    failures.push("check:c420ui-bootstrap-artifacts must not run build:metadata before validating artifacts");
  }
  if (artifactGateScript.includes("npm run build:c420ui-bootstrap")) {
    failures.push("check:c420ui-bootstrap-artifacts must not run build:c420ui-bootstrap before validating artifacts");
  }
  if (!validateProjectScript.includes("./scripts/validate-project.sh")) {
    failures.push("validate:project must delegate to ./scripts/validate-project.sh");
  }
  if (validateProjectScript.includes("npm run build:metadata")) {
    failures.push("validate:project must not run build:metadata before validate-project.sh pins committed metadata");
  }
  if (!validateProject.includes('run_step "npm run check:c420ui-node-check" npm run check:c420ui-node-check')) {
    failures.push("validate-project.sh must call check:c420ui-node-check explicitly");
  }
  if (!validateProject.includes('run_step "npm run check:c420ui-bootstrap-artifacts" npm run check:c420ui-bootstrap-artifacts')) {
    failures.push("validate-project.sh must call check:c420ui-bootstrap-artifacts explicitly");
  }
  if (!validateProject.includes('run_step "git diff --exit-code" git diff --exit-code')) {
    failures.push("validate-project.sh must call git diff --exit-code after artifact gates");
  }
  if (
    !adapterSource.includes("loadProjectInfo: loadProjectConfig") ||
    !/\n\s*loadProjectConfig,/.test(adapterSource)
  ) {
    failures.push("adapter.ts must keep both loadProjectInfo: loadProjectConfig and loadProjectConfig while CanvaLinuxC420UIAdapter requires both public keys");
  }
}

function checkLauncherBootstrapDependencyPolicy(failures: string[]): void {
  const rootDir = findProjectRoot();
  const launcher = readProjectFile(rootDir, "scripts/c420ui-builder.ts");

  for (const fragment of [
    "bootstrap/c420ui/run-c420ui.cjs",
    "bootstrap/c420ui/run-c420ui-cli.cjs",
    ".build/scripts/run-c420ui.js",
    ".build/scripts/run-c420ui-cli.js",
    "Run npm run build:c420ui-bootstrap",
  ] as const) {
    if (!launcher.includes(fragment)) failures.push(`scripts/c420ui-builder.ts: missing bootstrap launcher fragment ${fragment}`);
  }

  const bootstrapUiIndex = launcher.indexOf("bootstrap/c420ui/run-c420ui.cjs");
  const buildUiIndex = launcher.indexOf(".build/scripts/run-c420ui.js");
  const bootstrapCliIndex = launcher.indexOf("bootstrap/c420ui/run-c420ui-cli.cjs");
  const buildCliIndex = launcher.indexOf(".build/scripts/run-c420ui-cli.js");

  if (bootstrapUiIndex !== -1 && buildUiIndex !== -1 && bootstrapUiIndex > buildUiIndex) {
    failures.push("scripts/c420ui-builder.ts: interactive c420ui bootstrap bundle must be preferred before .build fallback");
  }
  if (bootstrapCliIndex !== -1 && buildCliIndex !== -1 && bootstrapCliIndex > buildCliIndex) {
    failures.push("scripts/c420ui-builder.ts: c420ui CLI bootstrap bundle must be preferred before .build fallback");
  }

  for (const forbidden of [
    "scripts/" + "ensure-npm-dependencies.sh",
    "CANVA_" + "REQUIRED_NPM_DEPS",
    "CANVA_" + "SKIP_NPM_INSTALL",
    "CANVA_" + "NPM_REPAIR",
    "npm install",
    "npm ci",
    "ensure_c420ui_bootstrap_npm_dependencies",
  ] as const) {
    if (launcher.includes(forbidden)) failures.push(`scripts/c420ui-builder.ts: must not restore launcher dependency policy fragment ${forbidden}`);
  }
}


function checkRuntimeCliDebugGuardrails(rootDir: string, failures: string[]): void {
  const runtimeCli = readOptionalProjectFile(rootDir, "electron/main/runtime-cli.ts") || "";
  const builder = readOptionalProjectFile(rootDir, "scripts/c420ui-builder.ts") || "";
  const runSh = readOptionalProjectFile(rootDir, "run.sh") || "";

  if (!runtimeCli.includes("--canva-debug=1") || !runtimeCli.includes("--canva-debug=2")) {
    failures.push("runtime-cli must document --canva-debug=1 and --canva-debug=2");
  }
  if (runtimeCli.includes("--debug=1                      Enable") || runtimeCli.includes("--debug=2                      Enable")) {
    failures.push("runtime-cli must not document --debug as a supported debug flag");
  }
  if (!runtimeCli.includes("RESERVED_DEBUG_MESSAGE") || !runtimeCli.includes("reserved by Electron/Node")) {
    failures.push("runtime-cli must treat --debug as reserved/prohibited");
  }
  if (!runSh.includes('--debug|--debug=*') || !runSh.includes('Use --canva-debug=1 or --canva-debug=2 instead.')) {
    failures.push("run.sh must block --debug/--debug=* and orient users to --canva-debug=1/2");
  }
  if (!builder.includes('"--canva-debug"') || !builder.includes("isRuntimeOnlyFlag")) {
    failures.push("builder must reject --canva-debug as a runtime-only option");
  }
  if (!builder.includes("isReservedDebugFlag") || !builder.includes("reserved by Electron/Node")) {
    failures.push("builder must reject --debug as reserved/runtime-owned");
  }

  const forbidden: Array<{ file: string; pattern: string; message: string }> = [
    { file: "electron/shared/debug.ts", pattern: "CANVA_DEBUG", message: "must not read legacy runtime debug env" },
    { file: "electron/shared/debug.ts", pattern: "CANVA_DEBUG_LEVEL", message: "must not read legacy runtime debug level env" },
    { file: "electron/main/runtime.ts", pattern: "CANVA_DEBUG", message: "must not read legacy runtime debug env" },
    { file: "run.sh", pattern: "CANVA_DEBUG", message: "must not export or interpret legacy runtime debug env" },
    { file: "scripts/c420ui-builder.ts", pattern: "--debug=1", message: "must not implement runtime debug flags" },
    { file: "scripts/c420ui-builder.ts", pattern: "--debug=2", message: "must not implement runtime debug flags" },
  ];

  for (const item of forbidden) {
    const contents = readOptionalProjectFile(rootDir, item.file);
    if (contents?.includes(item.pattern)) {
      failures.push(`${item.file}: ${item.message}: ${item.pattern}`);
    }
  }
}

function checkC420uiDetectionPanelsAndPlainLogsContract(rootDir: string, failures: string[]): void {
  const appPath = "packages/c420ui/src/terminal/app.ts";
  const summaryPath = "packages/c420ui/src/terminal/detected-installations-summary.ts";
  const artifactFragmentsPath = "scripts/c420ui-adapter/detection/artifact-fragments.ts";
  const app = readProjectFile(rootDir, appPath);
  const summary = readProjectFile(rootDir, summaryPath);
  const artifactFragments = readProjectFile(rootDir, artifactFragmentsPath);

  for (const label of ["Detected Installations", "Generated Artifacts", "Linux Artifacts"] as const) {
    if (!app.includes(`label: "${label}"`)) {
      failures.push(`c420ui must render ${label} as a separate panel.`);
    }
  }
  if (!app.includes("formatDetectionPanelSummaries") || !app.includes("generatedArtifacts.setContent") || !app.includes("linuxArtifacts.setContent")) {
    failures.push("c420ui must render Detected Installations, Generated Artifacts, and Linux Artifacts as separate panels.");
  }
  if (!summary.includes("formatDetectionPanelSummaries") || !summary.includes("linuxArtifacts") || !summary.includes('.join(", ")')) {
    failures.push("Linux Artifacts must render as a comma-separated artifact/version summary.");
  }
  if (!summary.includes("isGeneratedArtifactFragment") || !summary.includes('fragment.kind === "linux-unpacked"')) {
    failures.push("Generated Artifacts panel content must not include Linux Artifacts entries or repeat panel labels.");
  }
  const panelFormatterStart = summary.indexOf("export function formatDetectionPanelSummaries");
  const panelFormatterEnd = summary.indexOf("export function formatDetectedInstallationsSummary", panelFormatterStart);
  const panelFormatter = summary.slice(panelFormatterStart, panelFormatterEnd === -1 ? undefined : panelFormatterEnd);
  for (const repeatedLabel of ["Detected Installations", "Generated Artifacts", "Linux Artifacts"] as const) {
    if (panelFormatter.includes(`"${repeatedLabel}"`) || panelFormatter.includes(`\`${repeatedLabel}\``)) {
      failures.push("Panel content must not repeat panel labels.");
    }
  }
  if (app.includes("Plain Logs") || app.includes("plain logs") || app.includes('screen.key(["f6"]')) {
    failures.push("c420ui must not expose Plain Logs or F6 Plain Logs, and must not bind F6 to plain logs mode.");
  }
  const fullVersionIndex = artifactFragments.indexOf("metadata.fullVersion");
  const unknownFallbackIndex = artifactFragments.indexOf('kind !== "linux-unpacked"');
  if (fullVersionIndex === -1 || unknownFallbackIndex === -1 || fullVersionIndex > unknownFallbackIndex) {
    failures.push("Linux Artifacts must prefer build metadata fullVersion before showing version unknown.");
  }
}

function checkEffectiveBuildMetadataContract(rootDir: string, failures: string[]): void {
  const packageJson = JSON.parse(readProjectFile(rootDir, "package.json")) as {
    version?: string;
  };
  const projectUi = JSON.parse(
    readProjectFile(rootDir, "config/canva-linux/project-ui.json"),
  ) as { displayVersion?: string; phase?: string };
  const metadataPath = "config/canva-linux/build-metadata.json";
  const metadata = JSON.parse(readProjectFile(rootDir, metadataPath)) as {
    baseVersion?: string;
    baseDisplayVersion?: string;
    basePhase?: string;
    buildRevision?: string;
    version?: string;
    displayVersion?: string;
    phase?: string;
    fullVersion?: string;
  };
  const c420uiPackage = JSON.parse(
    readProjectFile(rootDir, "packages/c420ui/package.json"),
  ) as { version?: string };
  const oauthSource = readProjectFile(rootDir, "electron/main/oauth.ts");
  const buildMetadataSource = readProjectFile(rootDir, "electron/main/build-metadata.ts");
  const buildMetadataLoaderSource = readProjectFile(rootDir, "scripts/c420ui-adapter/build-metadata-loader.ts");
  const c420uiAdapterSource = readProjectFile(rootDir, "scripts/c420ui-adapter/adapter.ts");
  const bootstrapCheckSource = readProjectFile(rootDir, "scripts/checks/canva-linux/check-c420ui-bootstrap.ts");
  const packageJsonSource = readProjectFile(rootDir, "package.json");
  const bootstrapManifest = JSON.parse(
    readProjectFile(rootDir, "bootstrap/c420ui/manifest.json"),
  ) as Record<string, unknown>;
  const generatorSource = readProjectFile(rootDir, "scripts/generate-build-metadata.ts");

  if (packageJson.version?.includes("+g")) failures.push("package.json source version must not contain +g");
  if (projectUi.displayVersion?.includes("+g")) failures.push("project-ui displayVersion must not contain +g");
  if (projectUi.phase?.includes("+g")) failures.push("project-ui phase must not contain +g");
  if (metadata.baseVersion !== packageJson.version) failures.push(`${metadataPath}: baseVersion must match package.json version`);
  if (metadata.baseDisplayVersion !== projectUi.displayVersion) failures.push(`${metadataPath}: baseDisplayVersion must match project UI displayVersion`);
  if (metadata.basePhase !== projectUi.phase) failures.push(`${metadataPath}: basePhase must match project UI phase`);

  const revision = metadata.buildRevision || "unknown";
  if (revision !== "unknown" && !/^g[0-9a-fA-F]{7}$/.test(revision)) {
    failures.push(`${metadataPath}: buildRevision must be g<7-hex> or unknown`);
  }
  if (revision !== "unknown") {
    for (const [field, base] of [
      ["version", metadata.baseVersion],
      ["displayVersion", metadata.baseDisplayVersion],
      ["phase", metadata.basePhase],
      ["fullVersion", metadata.basePhase],
    ] as const) {
      if (metadata[field] !== `${base}+${revision}`) {
        failures.push(`${metadataPath}: ${field} must append +${revision}`);
      }
    }
  }
  for (const forbidden of ["0.1.4-15.Dev.7", "0.1.4-15.Dev"] as const) {
    if (buildMetadataSource.includes(forbidden)) {
      failures.push(`electron/main/build-metadata.ts: must not hardcode current release fallback literal ${forbidden}`);
    }
  }
  if (!buildMetadataSource.includes('"0.0.0"') || !buildMetadataSource.includes('"unknown"')) {
    failures.push("electron/main/build-metadata.ts: fallback metadata must be neutral 0.0.0/unknown");
  }
  if (!buildMetadataSource.includes("normalizeLoadedBuildMetadata")) {
    failures.push("electron/main/build-metadata.ts: loaded metadata must be normalized before use");
  }
  for (const forbidden of ["Math.random", "Date.now", "new Date(", "timestamp"] as const) {
    if (generatorSource.includes(forbidden)) failures.push(`build metadata generator must not use ${forbidden}`);
  }
  if (c420uiPackage.version !== "0.1.0") failures.push("packages/c420ui/package.json version must remain independent at 0.1.0");

  if (!buildMetadataLoaderSource.includes("loadEffectiveBuildMetadata")) {
    failures.push("scripts/c420ui-adapter/build-metadata-loader.ts: must expose loadEffectiveBuildMetadata");
  }
  for (const required of [
    "createRequire",
    "electron/main/build-metadata",
    "createBuildMetadata",
    "normalizeLoadedBuildMetadata",
  ] as const) {
    if (!buildMetadataLoaderSource.includes(required)) {
      failures.push(`scripts/c420ui-adapter/build-metadata-loader.ts: must use electron/main/build-metadata single source via ${required}`);
    }
  }
  for (const forbidden of [
    "function normalizeBuildRevision",
    "function appendBuildRevision",
    "function createBuildMetadata",
    "function normalizeLoadedBuildMetadata",
    "export type CanvaLinuxBuildMetadata =",
  ] as const) {
    if (buildMetadataLoaderSource.includes(forbidden)) {
      failures.push(`scripts/c420ui-adapter/build-metadata-loader.ts: must not duplicate electron/main/build-metadata implementation (${forbidden})`);
    }
  }
  if (!buildMetadataLoaderSource.includes("CANVA_LINUX_BUILD_REVISION") || !buildMetadataLoaderSource.includes("git") || !buildMetadataLoaderSource.includes("build-metadata.json")) {
    failures.push("build metadata loader must resolve env/git revisions before packaged metadata fallback");
  }
  if (!c420uiAdapterSource.includes("buildMetadata:") || !c420uiAdapterSource.includes("config/canva-linux/build-metadata.json")) {
    failures.push("c420ui adapter must expose and read config/canva-linux/build-metadata.json");
  }
  if (!c420uiAdapterSource.includes("getEffectiveProjectDisplayVersion") || !c420uiAdapterSource.includes("getEffectiveProjectPhase")) {
    failures.push("c420ui adapter must use effective displayVersion/phase helpers");
  }
  if (c420uiAdapterSource.includes('version: "0.1"')) {
    failures.push('c420ui brand version must not be hardcoded as "0.1"');
  }
  if (!c420uiAdapterSource.includes("packages/c420ui/package.json")) {
    failures.push("c420ui brand version must come from packages/c420ui/package.json");
  }
  if (!/"build:c420ui-bootstrap"\s*:\s*"[^"]*build:metadata/.test(packageJsonSource) && !readProjectFile(rootDir, "scripts/build-c420ui-bootstrap.ts").includes("loadEffectiveBuildMetadata")) {
    failures.push("build:c420ui-bootstrap must refresh or resolve effective build metadata before manifest generation");
  }
  for (const field of [
    "dependentProjectFullVersion",
    "dependentProjectBuildRevision",
    "dependentProjectDisplayVersion",
    "dependentProjectPhase",
  ] as const) {
    if (typeof bootstrapManifest[field] !== "string" || !bootstrapManifest[field]) {
      failures.push(`bootstrap/c420ui/manifest.json: missing ${field}`);
    }
  }

  if (!bootstrapCheckSource.includes("--check") || !bootstrapCheckSource.includes("validateGeneratedArtifactsMatchBuildRecipe")) {
    failures.push("c420ui bootstrap check must validate generated .cjs syntax and compare bundles against TypeScript build recipe");
  }
  if (!bootstrapCheckSource.includes("c420ui bootstrap bundle failed syntax validation. Regenerate bootstrap from TypeScript sources.")) {
    failures.push("c420ui bootstrap check must fail with the TypeScript-first node --check guidance");
  }
  if (!bootstrapCheckSource.includes("calculateC420UIBootstrapSourceHash")) {
    failures.push("c420ui bootstrap check must validate manifest.sourceHash from official source inputs");
  }
  if (!bootstrapCheckSource.includes("loadEffectiveBuildMetadata") || !bootstrapCheckSource.includes("dependentProjectBuildRevision") || !bootstrapCheckSource.includes("dependentProjectFullVersion")) {
    failures.push("c420ui bootstrap check must validate manifest dependent project metadata consistency");
  }
  if (!/PUBLIC_AUTH_TITLE_PATTERN[\s\S]*sign\\s\*in/.test(oauthSource) || !/PUBLIC_AUTH_TITLE_PATTERN[\s\S]*signin/.test(oauthSource)) {
    failures.push("OAuth public auth title pattern must recognize sign in and signin");
  }
  if (oauthSource.includes(`authButtons: count('[data-testid*="login"], [data-testid*="signup"], button[aria-label*="Log in"], button[aria-label*="Sign up"]')`)) {
    failures.push("OAuth public landing auth probe must not depend only on English aria-label selectors");
  }
  if (!oauthSource.includes("localizedAuthButtonKeywords") || !oauthSource.includes('href.includes("/signin")')) {
    failures.push("OAuth public landing auth probe must include localized/generic auth signal matching");
  }

  if (!/localizedAuthButtonKeywords[\s\S]*\.map\(\(k\) => k\.normalize\("NFKD"\)\)/.test(oauthSource)) {
    failures.push('OAuth localizedAuthButtonKeywords must normalize keywords with normalize("NFKD")');
  }
  if (!/String\(value \|\| ""\)[\s\S]*\.toLowerCase\(\)[\s\S]*\.normalize\("NFKD"\)/.test(oauthSource)) {
    failures.push('OAuth publicLandingSignalsProbeScript must normalize DOM attributes with normalize("NFKD")');
  }
  if (oauthSource.includes("mode = canLoadCanonicalHome") || oauthSource.includes("webContents.loadURL(CANVA_CANONICAL_HOME_URL);\n    } else if (reloadIgnoringCache)")) {
    failures.push("OAuth must not use canonical home as the default post-OAuth reload target");
  }
  if (!oauthSource.includes('"post-oauth-canonical-home-fallback"')) {
    failures.push("OAuth canonical home must remain fallback-only after the post-load probe");
  }
}


function checkPinnedHomeTabStripContract(rootDir: string, failures: string[]): void {
  const tabsPath = "electron/main/tabs.ts";
  const toolbarPath = "electron/ui/toolbar.html";
  const tabsSource = readProjectFile(rootDir, tabsPath);
  const toolbarSource = readProjectFile(rootDir, toolbarPath);

  assertIncludes(failures, tabsPath, tabsSource, "export type ToolbarTabItem");
  assertIncludes(failures, tabsPath, tabsSource, "pinnedHomeTab: ToolbarTabItem | null");
  assertIncludes(failures, tabsPath, tabsSource, "isHome: boolean");
  assertIncludes(failures, tabsPath, tabsSource, "function toToolbarTabItem(tab: TabEntry): ToolbarTabItem");
  if (!/pinnedHomeTab:\s*homeTab\s*\?\s*toToolbarTabItem\(homeTab\)\s*:\s*null/.test(tabsSource)) {
    failures.push(`${tabsPath}: toolbarState must expose the internal home tab as pinnedHomeTab`);
  }
  if (!/orderedTabs\.filter\(\(tab\)\s*=>\s*!tab\.isHome\)\.map\(toToolbarTabItem\)/.test(tabsSource)) {
    failures.push(`${tabsPath}: toolbarState().tabs must filter out home tabs before regular tab rendering`);
  }

  for (const expected of [
    'id="pinned-home-slot"',
    "function renderPinnedHomeTab(tab, activeTabId)",
    "function renderRegularTabs(tabs, activeTabId)",
    "renderPinnedHomeTab(state.pinnedHomeTab, state.activeTabId)",
    "renderRegularTabs(state.tabs || [], state.activeTabId)",
    "button.className = 'pinned-home'",
    "window.canvaTabs.send('go-home')",
  ] as const) {
    assertIncludes(failures, toolbarPath, toolbarSource, expected);
  }
  if (toolbarSource.includes('id="home"')) {
    failures.push(`${toolbarPath}: visible duplicate #home action must not exist when pinnedHomeTab is available`);
  }
  const pinnedHomeRenderer = toolbarSource.match(/function renderPinnedHomeTab[\s\S]*?\n    }\n\n    function renderRegularTabs/)?.[0] ?? "";
  const regularRenderer = toolbarSource.match(/function renderRegularTabs[\s\S]*?\n    }\n\n    if \(!window\.canvaTabs\)/)?.[0] ?? "";

  if (!toolbarSource.includes("function installIconFallback(favicon)")) {
    failures.push(`${toolbarPath}: toolbar must use a shared installIconFallback helper`);
  }
  if (!/function installIconFallback\(favicon\)[\s\S]*favicon\.onerror = null;[\s\S]*favicon\.src = iconPath;/.test(toolbarSource)) {
    failures.push(`${toolbarPath}: installIconFallback must clear favicon.onerror before falling back to iconPath`);
  }
  if (!pinnedHomeRenderer.includes("title.textContent = tab.title || 'Canva'")) {
    failures.push(`${toolbarPath}: pinned home renderer must use tab.title || 'Canva' for its visible label`);
  }
  if (pinnedHomeRenderer.includes("title.textContent = 'Canva'")) {
    failures.push(`${toolbarPath}: pinned home renderer must not hardcode the visible label to Canva`);
  }
  if (!pinnedHomeRenderer.includes("installIconFallback(favicon)")) {
    failures.push(`${toolbarPath}: pinned home renderer must install the shared favicon fallback`);
  }
  if (pinnedHomeRenderer.includes("tab-close") || pinnedHomeRenderer.includes("close-tab")) {
    failures.push(`${toolbarPath}: pinned home renderer must not render a close button`);
  }
  if (!regularRenderer.includes("for (const tab of tabs)")) {
    failures.push(`${toolbarPath}: regular tab renderer must iterate only its tabs argument`);
  }
  if (!regularRenderer.includes("installIconFallback(favicon)")) {
    failures.push(`${toolbarPath}: regular tab renderer must install the shared favicon fallback`);
  }
  if (regularRenderer.includes("pinnedHomeTab") || regularRenderer.includes("isHome")) {
    failures.push(`${toolbarPath}: regular tab renderer must not render pinnedHomeTab/home items`);
  }
}

function checkShellActionIds(failures: string[]): void {
  const rootDir = findProjectRoot();
  const actions = loadCanvaLinuxActions(rootDir);
  const actionIds = new Set(actions.map((action) => action.id));
  const visibleMissingDescription = actions.filter(
    (action) =>
      action.planned !== true &&
      action.kind === "command" &&
      ["install", "development", "maintenance"].includes(action.group) &&
      (!action.description || !action.description.trim()),
  );
  if (visibleMissingDescription.length) {
    failures.push(
      `Visible actions missing description: ${visibleMissingDescription.map((action) => action.id).join(", ")}`,
    );
  }

  const shell = fs.readFileSync(path.join(rootDir, "scripts/c420ui-builder.ts"), "utf8");
  const ids = [...shell.matchAll(/run_action_by_id\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((id): id is string => Boolean(id));
  const missing = ids.filter((id) => !actionIds.has(id));
  if (missing.length) {
    failures.push(`Shell references unknown action IDs: ${[...new Set(missing)].join(", ")}`);
  }
}

export function main(): number {
  const failures: string[] = [];
  const rootDir = findProjectRoot();

  if (hasDuplicateEntries(detectionBooleanFields)) {
    failures.push("detectionBooleanFields must not contain duplicate entries");
  }

  if (hasDuplicateEntries(detectionVersionFields)) {
    failures.push("detectionVersionFields must not contain duplicate entries");
  }

  checkAdapterContract(failures);
  checkRootProviderContract(failures);
  checkDependentProjectAdapterBoundary(failures);
  checkHostDependencyProviderContract(failures);
  checkSudoCommonContract(failures);
  checkPublicBranding(failures);
  checkProjectBoundary(failures);
  checkArtifactRecipes(failures);
  checkAppImageContract(failures);
  checkFlatpakContract(failures);
  checkReleaseArtifacts(failures);
  checkLauncherSessionLogs(failures);
  checkInteractiveLogUiIntegration(failures);
  checkNoParallelShellMenu(failures);
  checkNoRootLauncherContract(failures);
  checkCanvaLinuxConfigBoundary(failures);
  checkActionRegistryContract(failures);
  checkC420UIAdapterBoundary(rootDir, failures);
  checkDetectionProviderContract(failures);
  checkInstallationDetectionContract(failures);
  checkVersionConsistency(failures);
  checkReleaseContract(failures);
  checkDevelopmentTaskRecipes(failures);
  checkLauncherBootstrapDependencyPolicy(failures);
  checkRuntimeCliDebugGuardrails(rootDir, failures);
  checkEffectiveBuildMetadataContract(rootDir, failures);
  checkC420uiGeneratedArtifactsContract(rootDir, failures);
  checkC420uiDetectionPanelsAndPlainLogsContract(rootDir, failures);
  checkC420uiArtifactGateContract(rootDir, failures);
  checkPinnedHomeTabStripContract(rootDir, failures);
  validateBuilderArtifactsExist(rootDir, failures);
  validateLegacyBuilderArtifactsRemoved(rootDir, failures);
  validatePublicBuilderWrapper(rootDir, failures);
  validateInternalBuilderSource(rootDir, failures);
  validateRuntimeEnvFallbacksRemoved(rootDir, failures);
  validateBuilderAliasDocs(rootDir, failures);
  validateLegacyBuilderPathReferences(rootDir, failures);
  checkShellActionIds(failures);
  checkMetadataAndModalContracts(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-contracts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
