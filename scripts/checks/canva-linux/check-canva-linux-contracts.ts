#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-adapter/adapter";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../../canva-linux/project-root";
import { loadCanvaLinuxActions } from "../../canva-linux/actions/registry";
import { buildCanvaLinuxOverviewStatus } from "../../canva-linux/detection/provider";

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



type CoreCheckFileKind = "shell" | "typescript";

const noParallelShellMenuActiveFiles: Array<{ path: string; kind: CoreCheckFileKind }> = [
  { path: "canva-linux.sh", kind: "shell" },
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
  const devMatch = version.match(/^(\d+\.\d+\.\d+)-dev\.(\d+)\.(\d+)$/);
  if (devMatch) return `${devMatch[1]}.${devMatch[2]}-dev.${devMatch[3]}`;

  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) return version;

  throw new Error(`package.json version does not map to a project phase: ${version}`);
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

const checkAdapterContractRunner = (() => {
function main(): number {
  const rootDir = process.cwd();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const failures: string[] = [];
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

  const cliBridgePath = path.join(rootDir, "scripts/c420ui-adapter/cli.ts");
  const cliEntrypointPath = path.join(rootDir, "scripts/run-c420ui-cli.ts");
  const launcherPath = path.join(rootDir, "canva-linux.sh");
  const runSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-adapter/run.ts"), "utf8");
  if (!fs.existsSync(cliBridgePath)) failures.push("Canva Linux c420ui CLI bridge must exist");
  if (!fs.existsSync(cliEntrypointPath)) failures.push("Canva Linux c420ui CLI entrypoint must exist");
  const cliBridge = fs.readFileSync(cliBridgePath, "utf8");
  const bridgeSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-adapter/bridge.ts"), "utf8");
  if (!cliBridge.includes("emit:")) failures.push("Canva Linux c420ui CLI must forward emitted action logs");
  if (!cliBridge.includes("runC420UICli")) failures.push("scripts/c420ui-adapter/cli.ts must route direct actions through runC420UICli");
  if (!bridgeSource.includes("createC420UIActionEngine")) failures.push("scripts/c420ui-adapter/bridge.ts must route artifact actions through createC420UIActionEngine");
  if (!bridgeSource.includes("runC420UIArtifactWorkflow")) failures.push("scripts/c420ui-adapter/bridge.ts must use runC420UIArtifactWorkflow");
  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-adapter/adapter.ts"), "utf8");
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
  const developmentSource = fs.existsSync(path.join(rootDir, developmentAdapterPath))
    ? fs.readFileSync(path.join(rootDir, developmentAdapterPath), "utf8")
    : "";
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
  const launcher = fs.readFileSync(launcherPath, "utf8");
  if (!launcher.includes("run-c420ui-cli.js")) failures.push("launcher must call run-c420ui-cli.js for direct actions");
  const legacyRunCoreCli = "run-core-entry.sh " + "action-runner" + " --cli";
  if (launcher.includes(legacyRunCoreCli)) failures.push("launcher direct actions must not call the legacy Action Runner CLI");
  if (launcher.includes("--install-native | --install-flatpak")) failures.push("launcher must not hardcode the direct action flag list");
  if (!launcher.includes("ensure_c420ui_cli_entrypoint")) failures.push("launcher must build the c420ui CLI entrypoint conditionally");

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
  for (const fragment of [
    "ensureCanvaLinuxHostDependencies",
    "isC420UIHostDependencyFailure",
    "ensureHostDependencies",
  ] as const) {
    if (!runEntrypoint.includes(fragment)) {
      failures.push(`${runEntrypointPath}: must use Canva Linux dependency loader fragment ${fragment}`);
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
    "Install and Development Tool with sudo or as root.",
    "Do not run Canva Linux Install and Development Tool with sudo or as root.",
    "Do not run this tool with sudo or as root.",
    "Do not run the Tool with sudo or as root",
    "root/sudo launch is blocked",
    "must not instruct users to run ./canva-linux.sh with sudo",
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
    path.join(rootDir, "canva-linux.sh"),
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
  const artifactsConfig = artifactsConfigSource
    ? JSON.parse(artifactsConfigSource) as { workflows?: Array<Record<string, unknown>> }
    : { workflows: [] };
  const bridgeSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-adapter/bridge.ts"), "utf8");
  const failures: string[] = [];

  if (!fs.existsSync(artifactsConfigFullPath)) {
    failures.push(`${artifactsConfigPath}: artifact workflow recipes are required`);
  }
  if (!artifactsSource.includes(artifactsConfigPath)) {
    failures.push(`${artifactsAdapterPath}: must load ${artifactsConfigPath}`);
  }

  for (const fragment of [
    "buildActionId",
    "validateActionId",
    "installActionId",
    "uninstallActionId",
    "purgeActionId",
    "releaseActionId",
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
    "EXPECTED_CAPABILITY_FIELDS",
    "capabilities.${field} must be a boolean",
    "workflowIds",
    "duplicate workflow id",
    "ARTIFACT_WORKFLOW_KINDS",
    "ARTIFACT_WORKFLOW_SCOPES",
    "EXECUTABLE_ARTIFACT_ACTION_ID_FIELDS",
    "isExecutableArtifactActionField",
    "outputPattern.includes(\"x64\")",
    "outputPattern.includes(\"${arch}\")",
  ]) {
    if (!artifactsSource.includes(fragment)) {
      failures.push(`${artifactsAdapterPath}: missing validation fragment ${fragment}`);
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

  const expectedCapabilityFields = [
    "supportsArtifacts",
    "supportsInstall",
    "supportsUninstall",
    "supportsPurge",
    "supportsRelease",
    "supportsRootActions",
    "supportsDryRun",
    "supportsPlannedActions",
  ];
  for (const field of expectedCapabilityFields) {
    if (typeof (artifactsConfig as { capabilities?: Record<string, unknown> }).capabilities?.[field] !== "boolean") {
      failures.push(`${artifactsConfigPath}: capabilities.${field} must be a boolean`);
    }
  }

  const seenWorkflowIds = new Set<string>();
  const allowedKinds = new Set(["appimage", "flatpak", "native", "tarball", "custom", "deb", "rpm", "aur"]);
  const allowedScopes = new Set(["portable", "system", "user", "release", "none"]);
  for (const workflow of artifactsConfig.workflows ?? []) {
    const workflowId = typeof workflow.id === "string" ? workflow.id : "<unknown>";
    if (seenWorkflowIds.has(workflowId)) failures.push(`${artifactsConfigPath}: duplicate workflow id ${workflowId}`);
    seenWorkflowIds.add(workflowId);
    if (!allowedKinds.has(String(workflow.kind))) {
      failures.push(`${artifactsConfigPath}: workflow ${workflowId} has invalid kind ${String(workflow.kind)}`);
    }
    if (!allowedScopes.has(String(workflow.scope))) {
      failures.push(`${artifactsConfigPath}: workflow ${workflowId} has invalid scope ${String(workflow.scope)}`);
    }
  }

  const actionsById = new Map(adapter.loadActions().map((action) => [action.id, action]));
  for (const workflow of artifactsConfig.workflows ?? []) {
    const workflowId = typeof workflow.id === "string" ? workflow.id : "<unknown>";
    for (const field of [
      "buildActionId",
      "validateActionId",
      "installActionId",
      "uninstallActionId",
      "purgeActionId",
      "releaseActionId",
    ]) {
      const actionId = workflow[field];
      if (typeof actionId !== "string") continue;
      const action = actionsById.get(actionId);
      if (!action) {
        failures.push(`${artifactsConfigPath}: workflow ${workflowId} references unknown ${field} ${actionId}`);
        continue;
      }
      const actionPlanned = action.kind === "planned" || action.planned === true;
      if (workflow.planned === true && actionPlanned !== true) {
        failures.push(`${artifactsConfigPath}: planned workflow ${workflowId} points at executable ${field} ${actionId}`);
      }
      if (workflow.planned !== true && field !== "releaseActionId" && actionPlanned) {
        failures.push(`${artifactsConfigPath}: executable workflow ${workflowId} points at planned ${field} ${actionId}`);
      }
    }
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
    const actionIds = [
      workflow.buildActionId,
      workflow.validateActionId,
      workflow.installActionId,
      workflow.uninstallActionId,
      workflow.purgeActionId,
      workflow.releaseActionId,
    ].filter((id): id is string => Boolean(id));
    for (const actionId of actionIds) {
      const action = adapter.loadActions().find((candidate) => candidate.id === actionId);
      if (!action) {
        failures.push(`${workflow.id}: action ${actionId} does not exist`);
        continue;
      }
      const actionPlanned = action.kind === "planned" || action.planned === true;
      if (workflow.planned === true && actionPlanned !== true) {
        failures.push(`${workflow.id}: planned artifact workflow must not point at executable action ${actionId}`);
      }
    }
    for (const [field, actionId] of [
      ["buildActionId", workflow.buildActionId],
      ["validateActionId", workflow.validateActionId],
      ["installActionId", workflow.installActionId],
      ["uninstallActionId", workflow.uninstallActionId],
      ["purgeActionId", workflow.purgeActionId],
    ] as const) {
      if (!actionId || workflow.planned === true) continue;
      const action = adapter.loadActions().find((candidate) => candidate.id === actionId);
      const actionPlanned = action?.kind === "planned" || action?.planned === true;
      if (actionPlanned) {
        failures.push(`${workflow.id}: executable artifact workflow must not point ${field} at planned action ${actionId}`);
      }
    }
    if (!workflow.planned && workflow.kind !== "native" && !("outputPattern" in workflow)) {
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
  const launcher = read(rootDir, "canva-linux.sh");

  if (!launcher.includes(": > \"${SESSION_LOG}\"")) {
    failures.push("canva-linux.sh: launcher must create/truncate the session log once");
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
  if (!app.includes('screen.key(["f6"]')) {
    failures.push("packages/c420ui/src/terminal/app.ts: F6 plain logs fallback must remain available");
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
    !app.includes("for (const widget of [menu, diagnostics, content, logs])") ||
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
    !normalizedCliDocs.includes("F6") ||
    !normalizedTechnicalDocs.includes("F6") ||
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
  const launcher = readProjectFile(rootDir, "canva-linux.sh");
  const runTui = readProjectFile(rootDir, "scripts/run-c420ui.ts");
  const adapterRun = readProjectFile(rootDir, "scripts/c420ui-adapter/run.ts");
  const rootMessage =
    "Do not run Canva Linux Install and Development Tool with sudo or as root.";

  if (!launcher.includes('[[ "${EUID}" -eq 0 ]]')) {
    failures.push("canva-linux.sh: must block EUID=0 before launching Tool");
  }
  if (!launcher.includes(rootMessage)) {
    failures.push("canva-linux.sh: must explain that root/sudo launch is blocked");
  }
  if (!launcher.includes("administrator privileges")) {
    failures.push(
      "canva-linux.sh: root guard must explain privileges are requested only when needed",
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
    if (/sudo\s+\.\/canva-linux\.sh/.test(content)) {
      failures.push(
        `${relativePath}: must not instruct users to run ./canva-linux.sh with sudo`,
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


function checkDetectionProviderContract(failures: string[]): void {
  const rootDir = findProjectRoot();
  const providerPath = "scripts/canva-linux/detection/provider.ts";
  const rootProviderPath = "scripts/c420ui-adapter/root-provider.ts";
  const packageJsonPath = "package.json";

  if (!fs.existsSync(path.join(rootDir, providerPath))) {
    failures.push(`${providerPath} must exist`);
    return;
  }

  const provider = readProjectFile(rootDir, providerPath);
  const rootProvider = readProjectFile(rootDir, rootProviderPath);
  const packageJson = readProjectFile(rootDir, packageJsonPath);

  for (const fragment of [
    "createCanvaLinuxDetectionProvider",
    "buildCanvaLinuxOverviewStatus",
    "scripts/install-detection-common.sh",
    "parseC420UIDetectionKeyValueLines",
    "DETECTED_NATIVE_SYSTEM",
    "io.github.coletivo420.canva-linux",
    "canva-linux",
    "https://github.com/coletivo420/canva-linux",
  ]) {
    if (!provider.includes(fragment)) {
      failures.push(`${providerPath}: missing ${fragment}`);
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

  if (!rootProvider.includes('../canva-linux/detection/provider')) {
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
  if (phaseMatch[1] !== expectedPhase) {
    failures.push(`PROJECT_PHASE mismatch: expected ${expectedPhase}, got ${phaseMatch[1]}`);
  }
  if (displayVersionMatch[1] !== expectedPhase) {
    failures.push(
      `PROJECT_DISPLAY_VERSION mismatch: expected ${expectedPhase}, got ${displayVersionMatch[1]}`,
    );
  }
  if (projectUi.phase !== expectedPhase) {
    failures.push(
      `project-ui phase mismatch: expected ${expectedPhase}, got ${projectUi.phase || "missing"}`,
    );
  }
  if (projectUi.displayVersion !== expectedPhase) {
    failures.push(
      `project-ui displayVersion mismatch: expected ${expectedPhase}, got ${projectUi.displayVersion || "missing"}`,
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
  if (pkg.version && lock.version !== pkg.version) {
    failures.push("package-lock.json: top-level version must match package.json");
  }
  if (pkg.version && lock.packages?.[""]?.version !== pkg.version) {
    failures.push("package-lock.json: root package version must match package.json");
  }

  if (pkg.version) {
    const expectedPhase = expectedPhaseFromVersion(pkg.version);
    if (projectUi.displayVersion !== expectedPhase) {
      failures.push(`config/canva-linux/project-ui.json: displayVersion must be ${expectedPhase}`);
    }
    if (projectUi.phase !== expectedPhase) {
      failures.push(`config/canva-linux/project-ui.json: phase must be ${expectedPhase}`);
    }
    if (displayVersion !== expectedPhase) {
      failures.push(
        `scripts/app-identity-common.sh: PROJECT_DISPLAY_VERSION must be ${expectedPhase}`,
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

  const shell = fs.readFileSync(path.join(rootDir, "canva-linux.sh"), "utf8");
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
  checkDetectionProviderContract(failures);
  checkInstallationDetectionContract(failures);
  checkVersionConsistency(failures);
  checkReleaseContract(failures);
  checkDevelopmentTaskRecipes(failures);
  checkShellActionIds(failures);

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
