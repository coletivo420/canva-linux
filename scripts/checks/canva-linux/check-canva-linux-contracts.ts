#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";
import { findProjectRoot } from "../../core/action-registry";

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

const checkAdapterContractPart = (() => {
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

  const cliBridgePath = path.join(rootDir, "scripts/c420ui-canva-linux/cli.ts");
  const cliEntrypointPath = path.join(rootDir, "scripts/run-c420ui-cli.ts");
  const launcherPath = path.join(rootDir, "canva-linux.sh");
  if (!fs.existsSync(cliBridgePath)) failures.push("Canva Linux c420ui CLI bridge must exist");
  if (!fs.existsSync(cliEntrypointPath)) failures.push("Canva Linux c420ui CLI entrypoint must exist");
  const cliBridge = fs.readFileSync(cliBridgePath, "utf8");
  if (!cliBridge.includes("emit:")) failures.push("Canva Linux c420ui CLI must forward emitted action logs");
  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-canva-linux/adapter.ts"), "utf8");
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
  if (!adapterSource.includes("const actionEnv = context.env")) {
    failures.push("adapter must use the Action Engine/root provider prepared context.env");
  }
  if (adapterSource.includes("...context.env, ...(action.env")) {
    failures.push("adapter must not merge action.env after root provider environment preparation");
  }
  const launcher = fs.readFileSync(launcherPath, "utf8");
  if (!launcher.includes("run-c420ui-cli.js")) failures.push("launcher must call run-c420ui-cli.js for direct actions");
  if (launcher.includes("run-core-entry.sh action-runner --cli")) failures.push("launcher direct actions must not call the legacy Action Runner CLI");
  if (launcher.includes("--install-native | --install-flatpak")) failures.push("launcher must not hardcode the direct action flag list");
  if (!launcher.includes("ensure_c420ui_cli_entrypoint")) failures.push("launcher must build the c420ui CLI entrypoint conditionally");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-adapter-contract] OK");
  return 0;
}

  return { main };
})();

const checkRootProviderContractPart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const providerPath = "scripts/c420ui-canva-linux/root-provider.ts";
  const adapterPath = "scripts/c420ui-canva-linux/adapter.ts";
  const cliPath = "scripts/c420ui-canva-linux/cli.ts";
  const runPath = "scripts/c420ui-canva-linux/run.ts";
  const provider = read(rootDir, providerPath);
  const adapter = read(rootDir, adapterPath);
  const cli = read(rootDir, cliPath);
  const run = read(rootDir, runPath);
  const failures: string[] = [];

  for (const fragment of [
    "createCanvaLinuxRootProvider",
    "scripts/sudo-common.sh",
    "buildOverviewStatus",
    "purge",
    "uninstall-detected",
    "CANVA_NATIVE_SCOPE",
    "CANVA_FLATPAK_SCOPE",
    "validateRootAccess",
    "buildRootActionEnvironment",
    "CANVA_C420UI_ROOT_AUTH",
    "warning:",
  ]) {
    if (!provider.includes(fragment)) {
      failures.push(`missing Canva Linux root provider fragment: ${fragment}`);
    }
  }

  if (!fs.existsSync(path.join(rootDir, "scripts/sudo-common.sh"))) {
    failures.push("scripts/sudo-common.sh must back privileged actions");
  }
  if (!cli.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux CLI must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("rootProvider: createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass rootProvider to createApp");
  }
  for (const fragment of [
    "actionRequiresRootValidation",
    "buildActionEnvironment",
    "ROOT_POLICY_EXIT_CODE",
    "validateRootPolicy",
    "scripts/sudo-common.sh",
  ]) {
    if (adapter.includes(fragment)) {
      failures.push(
        `adapter must not import or implement legacy root policy fragment: ${fragment}`,
      );
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-root-provider-contract] OK");
  return 0;
}

  return { main };
})();

const checkSudoCommonContractPart = (() => {
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
  const sudoCommonPath = path.join(scriptsDir, "sudo-common.sh");
  const tuiAppPath = path.join(scriptsDir, "c420ui", "app.ts");
  const checkedFiles = [
    ...findCheckedFiles(scriptsDir),
    path.join(rootDir, "canva-linux.sh"),
  ].filter((f) => {
    const relative = path.relative(rootDir, f);
    return (
      !relative.endsWith("sudo-common.sh") &&
      relative !== "scripts/checks/canva-linux/check-canva-linux-contracts.ts" &&
      relative !== "scripts/core/check-ai-guardrails.ts"
    );
  });
  const failures: string[] = [];
  const sudoCommon = fs.readFileSync(sudoCommonPath, "utf8");
  const tuiApp = fs.readFileSync(tuiAppPath, "utf8");
  if (
    !tuiApp.includes("createInteractiveActionRunner") ||
    !tuiApp.includes("createActionEngine: createC420UIActionEngine") ||
    tuiApp.includes('from "./process-runner"') ||
    tuiApp.includes('const runnerArgs = ["action-runner", "--id", action.id]')
  ) {
    failures.push(
      "scripts/c420ui/app.ts: actions must execute through the shared c420ui Action Engine",
    );
  }

  if (!/--validate-stdin\)\s*canva_sudo_validate_stdin\s*;;/.test(sudoCommon)) {
    failures.push(
      "scripts/sudo-common.sh: dispatcher must implement --validate-stdin",
    );
  }

  if (!sudoCommon.includes('sudo -S -v -p ""')) {
    failures.push(
      'scripts/sudo-common.sh: --validate-stdin must validate with sudo -S -v -p ""',
    );
  }

  if (!/password\s*=\s*"\$\(cat\)"/.test(sudoCommon)) {
    failures.push("scripts/sudo-common.sh: --validate-stdin must read stdin");
  }

  const interactiveRunnerPath = path.join(
    scriptsDir,
    "c420ui",
    "interactive-action-runner.ts",
  );
  const interactiveRunner = fs.readFileSync(interactiveRunnerPath, "utf8");

  if (
    !interactiveRunner.includes("interactiveActionRequiresConfirmation(action)") ||
    !interactiveRunner.includes('status: "canceled"') ||
    !interactiveRunner.includes("!confirmed")
  ) {
    failures.push(
      "scripts/c420ui/interactive-action-runner.ts: confirmation cancellations must stop before root or bridge execution",
    );
  }

  if (
    !interactiveRunner.includes("rootProvider: options.rootProvider") ||
    !interactiveRunner.includes("engine.runAction(action")
  ) {
    failures.push(
      "scripts/c420ui/interactive-action-runner.ts: privileged actions must use the c420ui root provider before bridge execution",
    );
  }

  if (/appendLogText\([^)]*password/s.test(tuiApp)) {
    failures.push(
      "scripts/c420ui/app.ts: sudo password must never be written to logs",
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
          `${relativePath}:${index + 1}: raw sudo is forbidden; use scripts/sudo-common.sh`,
        );
      }
    });
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Sudo contract check passed");
  return 0;
}

  return { main };
})();

const checkPublicBrandingPart = (() => {
const publicFiles = [
  "README.md",
  "docs/TECHNICAL.md",
  "docs/VALIDATION.md",
  "docs/TYPESCRIPT.md",
  "docs/CLI.md",
  "docs/RELEASE.md",
  "CHANGELOG.md",
  "scripts/project-ui.json",
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

  const projectUi = JSON.parse(read(rootDir, "scripts/project-ui.json")) as {
    c420uiTitle?: string;
  };
  if (!projectUi.c420uiTitle?.includes("c420ui terminal interface")) {
    failures.push("scripts/project-ui.json: c420uiTitle must use c420ui terminal interface");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-branding] OK");
  return 0;
}

  return { main };
})();

const checkProjectBoundaryPart = (() => {
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
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const packageTypes = read(rootDir, "packages/c420ui/src/types.ts");
  const logo = read(rootDir, "scripts/c420ui/logo.ts");
  const settings = read(rootDir, "scripts/c420ui/settings.ts");
  const index = read(rootDir, "scripts/c420ui/index.ts");
  const adapter = read(rootDir, "scripts/c420ui-canva-linux/adapter.ts");
  const projectUi = read(rootDir, "scripts/project-ui.json");
  const failures: string[] = [];

  assertIncludes(
    failures,
    app,
    "../../packages/c420ui/src",
    "scripts/c420ui/app.ts must import generic c420ui types from packages/c420ui",
  );

  // Transitional PascalCase TypeScript symbols are allowed until the public API rename commit.
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
    index,
    "runCanvaLinuxC420UI",
    "scripts/c420ui/index.ts must delegate to the Canva Linux c420ui adapter runner",
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
      `scripts/c420ui/app.ts must read ${field} from project config`,
    );
    if (
      !adapter.includes(`${field}: projectUi.${field}`) &&
      !adapter.includes(`${field}: [...projectUi.${field}]`)
    ) {
      failures.push(
        `scripts/c420ui-canva-linux/adapter.ts must inject ${field} from scripts/project-ui.json`,
      );
    }
    assertIncludes(
      failures,
      projectUi,
      `"${field}":`,
      `scripts/project-ui.json must define ${field}`,
    );
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-project-boundary] OK");
  return 0;
}

  return { main };
})();

const checkArtifactRecipesPart = (() => {
function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const workflows = adapter.loadArtifactWorkflows();
  const actions = new Set(adapter.loadActions().map((action) => action.id));
  const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const failures: string[] = [];

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
      if (actionId !== "release-artifacts" && !actions.has(actionId)) {
        failures.push(`${workflow.id}: action ${actionId} does not exist`);
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
  console.log("[canva-linux-artifact-recipes] OK");
  return 0;
}

  return { main };
})();

const checkAppImageContractPart = (() => {
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
  console.log("[canva-linux-appimage-contract] OK");
  return 0;
}

  return { main };
})();

const checkFlatpakContractPart = (() => {
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
  console.log("[canva-linux-flatpak-contract] OK");
  return 0;
}

  return { main };
})();

const checkReleaseArtifactsPart = (() => {
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
  const releaseLinked = adapter.loadArtifactWorkflows().filter((workflow) => workflow.releaseActionId === "release-artifacts");
  if (!releaseLinked.some((workflow) => workflow.kind === "appimage")) failures.push("release must include AppImage workflow");
  if (!releaseLinked.some((workflow) => workflow.kind === "flatpak")) failures.push("release must include Flatpak workflow");
  if (adapter.loadCapabilities().supportsRelease !== true) failures.push("release capability must be supported");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-release-artifacts] OK");
  return 0;
}

  return { main };
})();

const checkLauncherSessionLogsPart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const launcher = read(rootDir, "canva-linux.sh");

  if (!launcher.includes(": > \"${SESSION_LOG}\"")) {
    failures.push("canva-linux.sh: launcher must create/truncate the session log once");
  }
  if (!app.includes('flags: "a"')) {
    failures.push("scripts/c420ui/app.ts: c420ui must append to the launcher session log");
  }
  if (!app.includes("importLauncherSessionLog")) {
    failures.push("scripts/c420ui/app.ts: launcher logs must be imported when Tool logs are enabled");
  }
  if (!app.includes("Tool |") || !app.includes("Action |")) {
    failures.push("scripts/c420ui/app.ts: Tool logs and Action logs must remain distinguishable");
  }
  if (!app.includes("shouldDisplayLogLine") || !app.includes("isCriticalToolLog")) {
    failures.push(
      "scripts/c420ui/app.ts: critical Tool warnings/errors must remain visible when general Tool logs are disabled",
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
      "scripts/c420ui/app.ts: writeSession must warn once when the session stream is unavailable",
    );
  }
  const writeSessionBlock =
    app.match(/const writeSession = \(line: string\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  if (writeSessionBlock.includes("appendLogText")) {
    failures.push(
      "scripts/c420ui/app.ts: writeSession must not call appendLogText directly",
    );
  }

  if (/appendLogText\([^)]*password/s.test(app)) {
    failures.push("scripts/c420ui/app.ts: sudo password must never be written to logs");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Tool logging contract check passed");
  return 0;
}

  return { main };
})();

const checkInteractiveLogUiIntegrationPart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const cliDocs = read(rootDir, "docs/CLI.md");
  const technicalDocs = read(rootDir, "docs/TECHNICAL.md");
  const normalizedCliDocs = cliDocs.replace(/\s+/g, " ");
  const normalizedTechnicalDocs = technicalDocs.replace(/\s+/g, " ");

  if (!app.includes('screen.key(["f5"]')) {
    failures.push("scripts/c420ui/app.ts: F5 log copy shortcut must remain available");
  }
  if (!app.includes('screen.key(["f6"]')) {
    failures.push("scripts/c420ui/app.ts: F6 plain logs fallback must remain available");
  }
  if (!app.includes("terminalTextSelectionMode")) {
    failures.push("scripts/c420ui/app.ts: terminal text selection mode is required");
  }
  if (!app.includes("type FocusZone") || !app.includes("FOCUS_ZONES")) {
    failures.push("scripts/c420ui/app.ts: explicit FocusZone model is required");
  }
  if (!app.includes("function applyFocusStyles")) {
    failures.push("scripts/c420ui/app.ts: active panel styling must be centralized");
  }
  if (
    !app.includes('screen.key(["tab"]') ||
    !app.includes('screen.key(["S-tab", "backtab"]')
  ) {
    failures.push("scripts/c420ui/app.ts: Tab and Shift+Tab focus navigation are required");
  }
  if (!app.includes("if (!modalActive) {") || !app.includes("moveFocus")) {
    failures.push(
      "scripts/c420ui/app.ts: modal dialogs must not leak Tab focus to the main c420ui",
    );
  }
  if (
    !app.includes("focusZone === \"menu\"") ||
    !app.includes("running || modalActive || focusZone !== \"menu\"")
  ) {
    failures.push(
      "scripts/c420ui/app.ts: action execution must be blocked unless menu is focused and idle",
    );
  }
  if (!app.includes("activeCellBg") || !app.includes("activeCheckboxFg")) {
    failures.push(
      "scripts/c420ui/app.ts: active cells and settings checkboxes must be visibly styled",
    );
  }
  if (
    !app.includes("terminalTextSelectionModeActive") ||
    !app.includes("let tuiMouseEnabled = !terminalTextSelectionModeActive")
  ) {
    failures.push(
      "scripts/c420ui/app.ts: terminal selection mode must initialize mouse state before Blessed widgets are constructed",
    );
  }
  const mouseControlledWidgetCount =
    app.match(/mouse: tuiMouseEnabled/g)?.length ?? 0;
  if (mouseControlledWidgetCount < 4) {
    failures.push(
      "scripts/c420ui/app.ts: terminal selection mode must disable c420ui mouse handling for menu, diagnostics, content and logs at startup",
    );
  }
  if (
    !app.includes("function applyProgramMouseMode") ||
    !app.includes("disableMouse") ||
    !app.includes("enableMouse")
  ) {
    failures.push(
      "scripts/c420ui/app.ts: terminal selection mode must disable and restore screen program mouse handling",
    );
  }
  if (
    !app.includes("function applyGlobalMouseMode") ||
    !app.includes("function setWidgetMouseEnabled") ||
    !app.includes("for (const widget of [menu, diagnostics, content, logs])") ||
    !app.includes("footer.setContent(footerContent())")
  ) {
    failures.push(
      "scripts/c420ui/app.ts: terminal selection mode must apply global mouse state to menu, diagnostics, content, logs and footer",
    );
  }
  if (!app.includes("Logs - Text selection mode enabled")) {
    failures.push(
      "scripts/c420ui/app.ts: enabled terminal text selection mode must be visible in the logs label",
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
        "scripts/c420ui/app.ts: keyboard log scrolling must remain available",
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
  console.log("[ok] Log selection contract check passed");
  return 0;
}

  return { main };
})();

function checkAdapterContract(failures: string[]): void {
  runCheck(failures, { name: "adapter contract", run: checkAdapterContractPart.main });
}

function checkRootProviderContract(failures: string[]): void {
  runCheck(failures, { name: "root provider contract", run: checkRootProviderContractPart.main });
}

function checkSudoCommonContract(failures: string[]): void {
  runCheck(failures, { name: "sudo-common contract", run: checkSudoCommonContractPart.main });
}

function checkPublicBranding(failures: string[]): void {
  runCheck(failures, { name: "public branding", run: checkPublicBrandingPart.main });
}

function checkProjectBoundary(failures: string[]): void {
  runCheck(failures, { name: "project adapter boundary", run: checkProjectBoundaryPart.main });
}

function checkArtifactRecipes(failures: string[]): void {
  runCheck(failures, { name: "artifact recipes", run: checkArtifactRecipesPart.main });
}

function checkAppImageContract(failures: string[]): void {
  runCheck(failures, { name: "AppImage contract", run: checkAppImageContractPart.main });
}

function checkFlatpakContract(failures: string[]): void {
  runCheck(failures, { name: "Flatpak contract", run: checkFlatpakContractPart.main });
}

function checkReleaseArtifacts(failures: string[]): void {
  runCheck(failures, { name: "release artifacts", run: checkReleaseArtifactsPart.main });
}

function checkLauncherSessionLogs(failures: string[]): void {
  runCheck(failures, { name: "launcher session logs", run: checkLauncherSessionLogsPart.main });
}

function checkInteractiveLogUiIntegration(failures: string[]): void {
  runCheck(failures, { name: "interactive log UI integration", run: checkInteractiveLogUiIntegrationPart.main });
}

export function main(): number {
  const failures: string[] = [];

  checkAdapterContract(failures);
  checkRootProviderContract(failures);
  checkSudoCommonContract(failures);
  checkPublicBranding(failures);
  checkProjectBoundary(failures);
  checkArtifactRecipes(failures);
  checkAppImageContract(failures);
  checkFlatpakContract(failures);
  checkReleaseArtifacts(failures);
  checkLauncherSessionLogs(failures);
  checkInteractiveLogUiIntegration(failures);

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
