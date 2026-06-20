#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

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

function collectTypeScriptFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(entryPath);
    if (entry.isFile() && entry.name.endsWith(".ts")) return [entryPath];
    return [];
  });
}

function collectTestSources(rootDir: string): Array<{ relativePath: string; source: string }> {
  return collectTypeScriptFiles(path.join(rootDir, "build-resources/c420ui/test")).map((filePath) => ({
    relativePath: path.relative(rootDir, filePath),
    source: fs.readFileSync(filePath, "utf8"),
  }));
}

const checkBoundaryContract = (() => {
const forbidden = [
  "Canva Linux",
  "CANVA LINUX",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "https://github.com/coletivo420/canva-linux",
  "CL-EyeDropper",
  "build-resources/canva-linux/config",
  "build-resources/canva-linux/c420ui-adapter",
  "CANVA" + "_",
  "electron-builder",
  "@typescript-eslint/parser",
  "scripts/" + "c420ui-" + "canva-linux",
  "scripts/canva-linux",
  "scripts/app-identity-common.sh",
  "build-resources/c420ui/scripts/install-detection-common.sh",
  "scripts/" + "sudo-common.sh",
  "CANVA" + "_NATIVE_SCOPE",
  "CANVA" + "_FLATPAK_SCOPE",
  "CANVA" + "_C420UI_ROOT_AUTH",
  "bundle-appimage",
  "bundle-flatpak",
  "install-flatpak-system",
  "install-native-system",
  "release-artifacts",
];

function readSource(rootDir: string): string {
  const srcDir = path.join(rootDir, "build-resources/c420ui/src");
  return collectTypeScriptFiles(srcDir)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

function main(): number {
  const rootDir = process.cwd();
  const source = readSource(rootDir);
  const failures = forbidden
    .filter((fragment) => source.includes(fragment))
    .map((fragment) => `build-resources/c420ui/src must not hardcode dependent-project fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] boundary OK");
  return 0;
}

  return { main };
})();

const checkDependentProjectBoundaryContract = (() => {
const forbiddenFragments = [
  "Canva Linux",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "build-resources/canva-linux/config",
  "build-resources/canva-linux/c420ui-adapter",
  "CANVA" + "_",
  "electron-builder",
  "@typescript-eslint/parser",
  "scripts/" + "c420ui-" + "canva-linux",
  "scripts/canva-linux",
  "scripts/app-identity-common.sh",
  "build-resources/c420ui/scripts/install-detection-common.sh",
  "scripts/" + "sudo-common.sh",
  "CANVA" + "_NATIVE_SCOPE",
  "CANVA" + "_FLATPAK_SCOPE",
  "CANVA" + "_C420UI_ROOT_AUTH",
  "bundle-appimage",
  "bundle-flatpak",
  "install-flatpak-system",
  "install-native-system",
  "release-artifacts",
] as const;

function main(): number {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "build-resources/c420ui/src");
  const failures: string[] = [];

  for (const file of collectTypeScriptFiles(srcDir)) {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
    const source = fs.readFileSync(file, "utf8");
    for (const fragment of forbiddenFragments) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: c420ui core must not contain dependent-project fragment ${fragment}`);
      }
    }
    const forbiddenImportPattern = new RegExp(
      String.raw`from\s+["'][^"']*(?:scripts\/c420ui-adapter|scripts\/` +
        "c420ui-" + "canva-linux" +
        String.raw`|scripts\/canva-linux|config\/canva-linux)`,
    );
    if (forbiddenImportPattern.test(source)) {
      failures.push(`${relativePath}: c420ui core must not import dependent-project adapters or config`);
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] dependent project boundary OK");
  return 0;
}

  return { main };
})();

const checkPackagePolicyContract = (() => {
type PackageJson = {
  private?: boolean;
  name?: string;
  type?: string;
  main?: string;
  types?: string;
};

function main(): number {
  const rootDir = process.cwd();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "build-resources/c420ui/package.json"), "utf8"),
  ) as PackageJson;
  const failures: string[] = [];
  if (pkg.name !== "@coletivo420/c420ui") failures.push("package name must remain scoped");
  if (pkg.private !== true) failures.push("package must remain private");
  if (pkg.type !== "module") failures.push("package must remain ESM-only");
  if (pkg.main !== "dist/index.js") failures.push("package main must point to dist/index.js");
  if (pkg.types !== "dist/index.d.ts") failures.push("package types must point to dist/index.d.ts");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] package policy OK");
  return 0;
}

  return { main };
})();

const checkPublicApiExportsContract = (() => {
function main(): number {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "build-resources/c420ui/src");
  const failures: string[] = [];
  for (const file of collectTypeScriptFiles(srcDir)) {
    const relativePath = path.relative(srcDir, file).replace(/\\/g, "/");
    const fileName = path.basename(file);
    if (!/^[a-z0-9-]+\.ts$/.test(fileName)) {
      failures.push(`${relativePath}: source file names must be kebab-case`);
    }
  }
  const expected = [
    "action-engine.ts",
    "actions.ts",
    "artifacts.ts",
    "bridge.ts",
    "detection.ts",
    "development-provider.ts",
    "capabilities.ts",
    "cli.ts",
    "command-runner.ts",
    "events.ts",
    "exit-codes.ts",
    "operational-logs.ts",
    "root-provider.ts",
    "scopes.ts",
    "linux-root-provider.ts",
    "host-dependencies.ts",
    "host-dependency-resolver.ts",
    "install-config.ts",
    "maintenance-config.ts",
    "rust-artifacts.ts",
    "rust-fs.ts",
    "rust-host.ts",
    "rust-maintenance.ts",
    "rust-preflight.ts",
    "rust-process-runner.ts",
    "rust-tui-contracts.ts",
    "types.ts",
    "workflow-runner.ts",
    "workflows.ts",
  ];
  const index = fs.readFileSync(path.join(srcDir, "index.ts"), "utf8");
  for (const file of expected) {
    if (!fs.existsSync(path.join(srcDir, file))) failures.push(`missing ${file}`);
  }
  for (const moduleName of expected.map((file) => `./${file.replace(/\.ts$/, ".js")}`)) {
    if (!index.includes(`from "${moduleName}"`)) {
      failures.push(`index.ts: missing public export for ${moduleName}`);
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] public API exports OK");
  return 0;
}

  return { main };
})();


const checkDetectionContractRunner = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const detectionPath = "build-resources/c420ui/src/detection.ts";
  const indexPath = "build-resources/c420ui/src/index.ts";
  const failures: string[] = [];

  if (!fs.existsSync(path.join(rootDir, detectionPath))) {
    failures.push(`${detectionPath}: missing detection engine`);
  }

  const detection = fs.existsSync(path.join(rootDir, detectionPath))
    ? read(rootDir, detectionPath)
    : "";
  const index = read(rootDir, indexPath);

  for (const fragment of [
    "runC420UIDetectionProbes",
    "c420uiDetectionProbe",
    "c420uiOverviewStatusProvider",
    "parseC420UIDetectionKeyValueLines",
    "boolFromC420UIDetectionValue",
    "buildC420UIOverviewStatus",
  ]) {
    if (!detection.includes(fragment)) {
      failures.push(`${detectionPath}: missing ${fragment}`);
    }
  }

  for (const fragment of [
    "Canva Linux",
    "canva-linux",
    "install-detection-common.sh",
    "DETECTED_NATIVE_SYSTEM",
    "io.github.coletivo420.canva-linux",
    "package:" + " project",
  ]) {
    if (detection.includes(fragment)) {
      failures.push(`${detectionPath}: must not hardcode ${fragment}`);
    }
  }

  if (!index.includes('from "./detection.js"')) {
    failures.push("index.ts: missing public export for ./detection");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] detection OK");
  return 0;
}

  return { main };
})();

function runDetectionContract(failures: string[]): void {
  runCheck(failures, { name: "detection", run: checkDetectionContractRunner.main });
}

function runDependentProjectBoundaryContract(failures: string[]): void {
  runCheck(failures, { name: "dependent project boundary", run: checkDependentProjectBoundaryContract.main });
}

const checkBridgeContractRunner = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const bridge = read(rootDir, "build-resources/c420ui/src/bridge.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const required = [
    "c420uiProjectInfo",
    "c420uiExecutionContext",
    "c420uiActionResult",
    "c420uiProjectBridge",
    "projectInfo()",
    "actions()",
    "artifactWorkflows()",
    "runAction(actionId: string, context: c420uiExecutionContext)",
    "overviewStatus?()",
    "c420uiOverviewStatus",
    "createC420UIBridge",
    "export type * from \"./bridge.js\"",
  ];
  const failures = required
    .filter((fragment) => !bridge.includes(fragment) && !index.includes(fragment))
    .map((fragment) => `missing bridge contract fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] bridge OK");
  return 0;
}

  return { main };
})();


const checkActionValidationContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const actions = read(rootDir, "build-resources/c420ui/src/actions.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const required = [
    "c420uiActionValidationOptions",
    "validateC420UIActions",
    "validateC420UIActionRegistry",
    "allowedGroups",
    "allowedSections",
    "allowedKinds",
    "allowedScopes",
    "Duplicate action id",
    "Duplicate cli alias",
    "Dangerous action must set requiresConfirmation=true",
  ];
  const failures = required
    .filter((fragment) => !actions.includes(fragment) && !index.includes(fragment))
    .map((fragment) => `missing action validation fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] action validation OK");
  return 0;
}

  return { main };
})();

const checkActionEngineContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const actionEngine = read(rootDir, "build-resources/c420ui/src/action-engine.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const required = [
    "createC420UIActionEngine",
    "resolveActionById",
    "resolveActionByCliFlag",
    "runActionById",
    "runAction",
    "bridge.runAction",
    "c420uiExitCodes.plannedAction",
    "c420uiExitCodes.success",
    "isC420UIPlannedAction",
    "dryRun",
    "requiresC420UIActionConfirmation",
    "Action requires confirmation",
  ];
  const forbidden = [
    "Canva Linux",
    "canva-linux",
    "io.github.coletivo420.canva-linux",
    "project-ui.json",
    "build-resources/canva-linux/config/actions.json",
  ];
  const failures = [
    ...required
      .filter((fragment) => !actionEngine.includes(fragment))
      .map((fragment) => `missing action engine contract fragment: ${fragment}`),
    ...forbidden
      .filter((fragment) => actionEngine.includes(fragment))
      .map((fragment) => `action engine must not contain project-specific fragment: ${fragment}`),
  ];

  if (!index.includes('export { createC420UIActionEngine } from "./action-engine.js"')) {
    failures.push("index must export createC420UIActionEngine");
  }
  if (!index.includes('} from "./action-engine.js"')) {
    failures.push("index must export action engine types");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] action engine OK");
  return 0;
}

  return { main };
})();

const checkCliContractRunner = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const cli = read(rootDir, "build-resources/c420ui/src/cli.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const required = [
    "runC420UICli",
    "c420uiCliOptions",
    "c420uiCliResult",
    "Only one direct action can be executed per invocation",
    "resolveActionByCliFlag",
    "Unknown option",
  ];
  const forbidden = [
    "Canva Linux",
    "canva-linux",
    "--doctor",
    "--bundle-appimage",
    "--purge",
  ];
  const failures = [
    ...required
      .filter((fragment) => !cli.includes(fragment))
      .map((fragment) => `missing c420ui CLI contract fragment: ${fragment}`),
    ...forbidden
      .filter((fragment) => cli.includes(fragment))
      .map((fragment) => `generic c420ui CLI must not contain project-specific fragment: ${fragment}`),
  ];

  if (!index.includes('export { runC420UICli } from "./cli.js"')) {
    failures.push("index must export runC420UICli");
  }
  if (!index.includes('export type { c420uiCliOptions, c420uiCliResult } from "./cli.js"')) {
    failures.push("index must export c420ui CLI types");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] CLI OK");
  return 0;
}

  return { main };
})();

const checkRootProviderContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const rootProvider = read(rootDir, "build-resources/c420ui/src/root-provider.ts");
  const linuxRootProvider = read(rootDir, "build-resources/c420ui/src/linux-root-provider.ts");
  const scopes = read(rootDir, "build-resources/c420ui/src/scopes.ts");
  const actions = read(rootDir, "build-resources/c420ui/src/actions.ts");
  const actionEngine = read(rootDir, "build-resources/c420ui/src/action-engine.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "c420uiRootProvider",
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
    "validateRootAccessWithInput",
    "buildRootActionEnvironment",
    "c420uiRootPolicyExitCode",
    "warning?: string",
  ]) {
    if (!rootProvider.includes(fragment)) {
      failures.push(`missing root provider contract fragment: ${fragment}`);
    }
  }

  for (const fragment of [
    "rootProvider?: c420uiRootProvider",
    "rootProvider.buildActionEnvironment",
    "rootProvider.validateActionScope",
    "rootProvider.resolveRootPolicy",
    "rootProvider.validateRootAccess",
    "requestRootAccess",
    "rootProvider.buildRootActionEnvironment",
    "bridge.runAction",
  ]) {
    if (!actionEngine.includes(fragment)) {
      failures.push(`action engine root provider preflight missing: ${fragment}`);
    }
  }

  const rootPreflightIndex = actionEngine.indexOf(
    "rootProvider.validateRootAccess",
  );
  const runActionIndex = actionEngine.indexOf("bridge.runAction");
  if (
    rootPreflightIndex === -1 ||
    runActionIndex === -1 ||
    rootPreflightIndex > runActionIndex
  ) {
    failures.push("root provider preflight must run before bridge.runAction");
  }

  if (!index.includes('export type * from "./root-provider.js"')) {
    failures.push("index must export root provider types");
  }
  for (const fragment of [
    'export * from "./scopes.js"',
    'export * from "./linux-root-provider.js"',
  ]) {
    if (!index.includes(fragment)) {
      failures.push(`index must export ${fragment}`);
    }
  }
  for (const fragment of [
    "c420uiKnownActionScopes",
    "c420uiActionScope",
    "normalizeC420UIActionScope",
    "isC420UIUserScope",
    "isC420UISystemScope",
    "isC420UIAutoScope",
  ]) {
    if (!scopes.includes(fragment)) {
      failures.push(`scopes.ts missing ${fragment}`);
    }
  }
  if (!actions.includes("c420uiActionScope")) {
    failures.push("actions.ts must use c420uiActionScope");
  }
  for (const fragment of [
    "createC420UILinuxRootProviderBase",
    "validateC420UILinuxActionScope",
    "defaultC420UILinuxBuildActionEnvironment",
    "defaultC420UILinuxActionHasUserScope",
    "defaultC420UILinuxRootValidationCommand",
    "defaultC420UILinuxRootValidationStdinCommand",
    "buildRootValidationCommand",
    "buildRootValidationStdinCommand",
    `stdio: ["pipe", "pipe", "pipe"]`,
    "sudoCommand",
    "rootAuthEnvKey",
    "rootAuthEnvValue",
  ]) {
    if (!linuxRootProvider.includes(fragment)) {
      failures.push(`linux-root-provider.ts missing ${fragment}`);
    }
  }
  for (const fragment of [
    "Canva Linux",
    "CANVA" + "_NATIVE_SCOPE",
    "CANVA" + "_FLATPAK_SCOPE",
    "CANVA" + "_C420UI_ROOT_AUTH",
    "scripts/" + "sudo-common.sh",
  ]) {
    if (linuxRootProvider.includes(fragment)) {
      failures.push(`linux-root-provider.ts must not hardcode ${fragment}`);
    }
  }
  if (!index.includes('c420uiRootPolicyExitCode')) {
    failures.push("index must export c420uiRootPolicyExitCode");
  }
  if (!actionEngine.includes("rootPolicy.warning")) {
    failures.push("action engine must emit root policy warnings");
  }
  const bridge = read(rootDir, "build-resources/c420ui/src/bridge.ts");
  if (bridge.includes("C420UISudoProvider")) {
    failures.push("bridge must not expose C420UISudoProvider separately from c420uiRootProvider");
  }
  if (rootProvider.includes("sudo-common.sh") || actionEngine.includes("sudo")) {
    failures.push("c420ui core must not call sudo directly");
  }
  const runner = read(rootDir, "build-resources/c420ui/src/terminal/interactive-action-runner.ts");
  const rustTuiRunner = read(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts");
  if (!runner.includes("requestRootAccess")) {
    failures.push("interactive-action-runner.ts must pass requestRootAccess to the action engine");
  }
  if (
    !rustTuiRunner.includes("validateRootAccessWithInput") ||
    !rustTuiRunner.includes('submittedInput = ""') ||
    !rustTuiRunner.includes("Root authentication failed")
  ) {
    failures.push("rust-tui-runner.ts must validate root input, clear submittedInput and keep a generic failure message");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] root provider OK");
  return 0;
}

  return { main };
})();

const checkCommandRunnerContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const runner = read(rootDir, "build-resources/c420ui/src/command-runner.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "runC420UICommand",
    "c420uiCommandRunnerOptions",
    "emitLog",
    "emitProgress",
    "runC420UIRustProcess",
    "processRunner",
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`command runner must include contract fragment: ${fragment}`);
    }
  }
  for (const forbidden of [
    "node:child_process",
    "spawnCommand",
    "StringDecoder",
    'stdio: ["ignore", "pipe", "pipe"]',
  ]) {
    if (runner.includes(forbidden)) {
      failures.push(`command runner must not include legacy process fragment: ${forbidden}`);
    }
  }

  if (!index.includes('export { runC420UICommand } from "./command-runner.js"')) {
    failures.push("index must export runC420UICommand");
  }
  if (!index.includes('export type { c420uiCommandRunnerOptions } from "./command-runner.js"')) {
    failures.push("index must export c420uiCommandRunnerOptions");
  }
  if (fs.existsSync(path.join(rootDir, "build-resources/c420ui/src/terminal/process-runner.ts"))) {
    failures.push("build-resources/c420ui/src/terminal/process-runner.ts must not exist after command runner migration");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] command runner OK");
  return 0;
}

  return { main };
})();

const checkOperationalLogsContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const operationalLogs = read(rootDir, "build-resources/c420ui/src/operational-logs.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "createC420UIOperationalLogEvent",
    "redactC420UILogLine",
    "c420uiDefaultRedactionPatterns",
    "Bearer [redacted]",
    "[redacted]",
    "redact?: boolean",
    "timestamp: new Date().toISOString()",
  ]) {
    if (!operationalLogs.includes(fragment)) {
      failures.push(`operational logs contract must include fragment: ${fragment}`);
    }
  }

  if (!index.includes('from "./operational-logs.js"')) {
    failures.push("index must export operational log helpers");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] operational logs OK");
  return 0;
}

  return { main };
})();

const checkArtifactWorkflowContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const artifacts = read(rootDir, "build-resources/c420ui/src/artifacts.ts");
  const index = read(rootDir, "build-resources/c420ui/src/index.ts");
  const workflows = read(rootDir, "build-resources/c420ui/src/workflows.ts");
  const workflowRunnerPath = "build-resources/c420ui/src/workflow-runner.ts";
  const workflowRunner = read(rootDir, workflowRunnerPath);
  const required = [
    "c420uiArtifactKind",
    "c420uiArtifactScope",
    "c420uiArtifactWorkflow",
    "c420uiArtifactRecipeWorkflow",
    "scope: c420uiArtifactScope",
    "workflows: c420uiArtifactRecipeWorkflow[]",
    "buildActionId",
    "validateActionId",
    "installActionId",
    "uninstallActionId",
    "purgeActionId",
    "releaseActionId",
    "custom",
    "validateC420UIArtifactRecipeConfig",
    "validateC420UIArtifactWorkflowsAgainstActions",
    "resolveC420UIArtifactOutputPattern",
    "requiresRoot=false",
    "user-scoped",
    "system-scoped",
    "runC420UIWorkflow",
    "runC420UIArtifactWorkflow",
    "c420uiArtifactWorkflowRunOptions",
    "c420uiWorkflowPhase",
  ];
  const source = `${artifacts}\n${workflows}\n${workflowRunner}`;
  const failures = required
    .filter((fragment) => !source.includes(fragment))
    .map((fragment) => `missing artifact/workflow contract fragment: ${fragment}`);

  if (!fs.existsSync(path.join(rootDir, workflowRunnerPath))) {
    failures.push(`${workflowRunnerPath}: missing artifact workflow runner`);
  }

  for (const fragment of [
    "validateC420UIArtifactRecipeConfig",
    "validateC420UIArtifactWorkflowsAgainstActions",
    "resolveC420UIArtifactOutputPattern",
  ]) {
    if (!index.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/index.ts must export ${fragment}`);
    }
  }

  for (const fragment of [
    "Canva Linux",
    "build-resources/canva-linux/config",
    "canva-linux-${version}",
  ]) {
    if (artifacts.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/artifacts.ts must not contain project-specific fragment ${fragment}`);
    }
  }

  for (const fragment of [
    "Canva Linux",
    "canva-linux",
    "bundle-appimage",
    "bundle-flatpak",
    "install-flatpak-system",
    "createCanvaLinux",
    "c420ui-adapter",
    "ProjectAdapter",
  ]) {
    if (workflowRunner.includes(fragment)) {
      failures.push(`${workflowRunnerPath}: must not hardcode ${fragment}`);
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] artifact workflows OK");
  return 0;
}

  return { main };
})();

const checkInteractiveActionEngineContract = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const runner = read(rootDir, "build-resources/c420ui/src/terminal/interactive-action-runner.ts");
  const rustTuiRunner = read(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts");
  const bridge = read(rootDir, "build-resources/c420ui/src/bridge.ts");
  const failures: string[] = [];

  for (const fragment of [
    "createC420UIActionEngine",
    "requestRootAccess",
    "engine.runAction(action",
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`interactive action runner must include action engine fragment: ${fragment}`);
    }
  }
  for (const fragment of ["runActionById", "rootProvider", "validateRootAccessWithInput"]) {
    if (!rustTuiRunner.includes(fragment)) {
      failures.push(`rust-tui-runner must keep TypeScript Action Engine bridge fragment: ${fragment}`);
    }
  }
  if (bridge.includes("C420UISudoProvider")) {
    failures.push("bridge contract must not reintroduce C420UISudoProvider");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] interactive action engine OK");
  return 0;
}

  return { main };
})();

function runBoundaryContract(failures: string[]): void {
  runCheck(failures, { name: "boundary", run: checkBoundaryContract.main });
}

function runPackagePolicyContract(failures: string[]): void {
  runCheck(failures, { name: "package policy", run: checkPackagePolicyContract.main });
}

function runPublicApiExportsContract(failures: string[]): void {
  runCheck(failures, { name: "public API exports", run: checkPublicApiExportsContract.main });
}

function runBridgeContract(failures: string[]): void {
  runCheck(failures, { name: "bridge contract", run: checkBridgeContractRunner.main });
}

function runActionValidationContract(failures: string[]): void {
  runCheck(failures, { name: "action validation", run: checkActionValidationContract.main });
}

function runActionEngineContract(failures: string[]): void {
  runCheck(failures, { name: "action engine", run: checkActionEngineContract.main });
}

function runCliContract(failures: string[]): void {
  runCheck(failures, { name: "CLI contract", run: checkCliContractRunner.main });
}

function runRootProviderContract(failures: string[]): void {
  runCheck(failures, { name: "root provider", run: checkRootProviderContract.main });
}

function runCommandRunnerContract(failures: string[]): void {
  runCheck(failures, { name: "command runner", run: checkCommandRunnerContract.main });
}

function runOperationalLogsContract(failures: string[]): void {
  runCheck(failures, { name: "operational logs", run: checkOperationalLogsContract.main });
}

function runArtifactWorkflowContract(failures: string[]): void {
  runCheck(failures, { name: "artifact workflows", run: checkArtifactWorkflowContract.main });
}

function runInteractiveActionEngineContract(failures: string[]): void {
  runCheck(failures, { name: "interactive action engine", run: checkInteractiveActionEngineContract.main });
}



function assertC420UIIncludes(
  failures: string[],
  content: string,
  fragment: string,
  message: string,
): void {
  if (!content.includes(fragment)) {
    failures.push(message);
  }
}

function checkTerminalUiContract(failures: string[]): void {
  const rootDir = process.cwd();
  const terminalDir = path.join(rootDir, "build-resources/c420ui/src/terminal");
  const required = [
    "app-options.ts",
    "index.ts",
    "interactive-action-runner.ts",
    "logo.ts",
    "settings.ts",
    "theme.ts",
    "clipboard.ts",
    "root-guard.ts",
    "runtime.ts",
    "help.ts",
  ];
  for (const file of required) {
    if (!fs.existsSync(path.join(terminalDir, file))) {
      failures.push(`build-resources/c420ui/src/terminal/${file}: missing terminal UI file`);
    }
  }
  if (fs.existsSync(path.join(rootDir, "scripts/c420ui"))) {
    failures.push("scripts/c420ui must not exist");
  }
  for (const removed of ["app.ts", "blessed-widgets.ts", "modal.ts"] as const) {
    if (fs.existsSync(path.join(terminalDir, removed))) {
      failures.push(`build-resources/c420ui/src/terminal/${removed} must not exist after Rust TUI migration`);
    }
  }
  const terminalSource = fs.existsSync(terminalDir)
    ? collectTypeScriptFiles(terminalDir).map((file) => fs.readFileSync(file, "utf8")).join("\n")
    : "";
  for (const fragment of [
    "Canva Linux",
    "canva-linux",
    "io.github.coletivo420.canva-linux",
    "scripts/run-core-entry.sh",
    "overview-status",
    "install-detection-common.sh",
    "DETECTED_NATIVE_SYSTEM",
    "build-resources/canva-linux/c420ui-adapter",
    "scripts/" + "sudo-common.sh",
  ]) {
    if (terminalSource.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/terminal must not contain ${fragment}`);
    }
  }

  const index = fs.existsSync(path.join(terminalDir, "index.ts"))
    ? fs.readFileSync(path.join(terminalDir, "index.ts"), "utf8")
    : "";
  const rootGuard = fs.existsSync(path.join(terminalDir, "root-guard.ts"))
    ? fs.readFileSync(path.join(terminalDir, "root-guard.ts"), "utf8")
    : "";
  const runtime = fs.existsSync(path.join(terminalDir, "runtime.ts"))
    ? fs.readFileSync(path.join(terminalDir, "runtime.ts"), "utf8")
    : "";
  const help = fs.existsSync(path.join(terminalDir, "help.ts"))
    ? fs.readFileSync(path.join(terminalDir, "help.ts"), "utf8")
    : "";
  const settings = fs.existsSync(path.join(terminalDir, "settings.ts"))
    ? fs.readFileSync(path.join(terminalDir, "settings.ts"), "utf8")
    : "";
  const clipboard = fs.existsSync(path.join(terminalDir, "clipboard.ts"))
    ? fs.readFileSync(path.join(terminalDir, "clipboard.ts"), "utf8")
    : "";
  const rustClipboardPath = path.join(rootDir, "build-resources/c420ui/src/rust-clipboard.ts");
  const rustClipboard = fs.existsSync(rustClipboardPath)
    ? fs.readFileSync(rustClipboardPath, "utf8")
    : "";
  const appOptions = fs.existsSync(path.join(terminalDir, "app-options.ts"))
    ? fs.readFileSync(path.join(terminalDir, "app-options.ts"), "utf8")
    : "";
  if (!appOptions.includes("export type C420UIAppOptions") || !appOptions.includes("c420uiProjectBridge")) {
    failures.push("build-resources/c420ui/src/terminal/app-options.ts must own C420UIAppOptions");
  }
  if (index.includes("createApp") || index.includes("HeaderLayout") || index.includes("./app.js")) {
    failures.push("build-resources/c420ui/src/terminal/index.ts must not export the legacy Blessed app");
  }
  for (const fragment of [
    "createC420UIRootLaunchGuardMessage",
    "isC420UIRootLaunch",
    "enforceC420UIRootLaunchGuard",
  ]) {
    if (!rootGuard.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/terminal/root-guard.ts must contain ${fragment}`);
    }
    if (!index.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/terminal/index.ts must export ${fragment}`);
    }
  }
  if (!runtime.includes("runC420UITerminalApp")) {
    failures.push("build-resources/c420ui/src/terminal/runtime.ts must contain runC420UITerminalApp");
  }
  if (!index.includes("runC420UITerminalApp")) {
    failures.push("build-resources/c420ui/src/terminal/index.ts must export runC420UITerminalApp");
  }
  if (!runtime.includes("runC420UIRustTuiApp")) {
    failures.push("build-resources/c420ui/src/terminal/runtime.ts must call runC420UIRustTuiApp");
  }
  if (runtime.includes("createApp") || runtime.includes("blessed-widgets")) {
    failures.push("build-resources/c420ui/src/terminal/runtime.ts must not construct the legacy blessed UI");
  }
  if (!help.includes("formatC420UITerminalHelp") || !index.includes("formatC420UITerminalHelp")) {
    failures.push("build-resources/c420ui/src/terminal/help.ts must provide exported help formatting");
  }
  if (settings.includes("rootLaunchGuardMessage")) {
    failures.push("build-resources/c420ui/src/terminal/settings.ts must not contain rootLaunchGuardMessage");
  }
  if (!rustClipboard) {
    failures.push("build-resources/c420ui/src/rust-clipboard.ts must exist");
  }
  if (!clipboard.includes("copyTextToClipboardWithRust")) {
    failures.push("build-resources/c420ui/src/terminal/clipboard.ts must delegate to rust-clipboard");
  }
  for (const forbidden of ["node:child_process", "spawnSync", "bash", "command -v", "wl-copy", "qdbus", "gpaste", "xclip", "xsel"] as const) {
    if (clipboard.includes(forbidden)) {
      failures.push(`build-resources/c420ui/src/terminal/clipboard.ts must not contain ${forbidden}`);
    }
  }
  const guardIndex = runtime.indexOf("enforceC420UIRootLaunchGuard");
  const rustRunIndex = runtime.indexOf("runRustTuiApp");
  if (guardIndex < 0 || rustRunIndex < 0 || guardIndex > rustRunIndex) {
    failures.push("build-resources/c420ui/src/terminal/runtime.ts must enforce root guard before c420ui-tui startup");
  }
  const packageJson = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
  if (packageJson.includes("--external:blessed")) {
    failures.push("package.json build scripts must not externalize blessed");
  }
  const bootstrapRecipe = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/bootstrap/build-recipe.ts"), "utf8");
  for (const forbidden of ['"blessed"', '"term.js"', '"pty.js"'] as const) {
    if (bootstrapRecipe.includes(forbidden)) {
      failures.push(`build-resources/c420ui/bootstrap/build-recipe.ts must not externalize ${forbidden}`);
    }
  }
  const hostBin = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/bin/c420ui-host.rs"), "utf8");
  const commandsMod = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/commands/mod.rs"), "utf8");
  if (!hostBin.includes("clipboard-write --json") || !hostBin.includes("commands::clipboard_write::execute")) {
    failures.push("c420ui-host usage and command dispatch must include clipboard-write --json");
  }
  if (!commandsMod.includes("pub mod clipboard_write")) {
    failures.push("build-resources/c420ui-rs/src/commands/mod.rs must include clipboard_write");
  }
}

function checkHeaderLayoutContract(failures: string[]): void {
  const rootDir = process.cwd();
  const packageTypes = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/types.ts"), "utf8");
  const legacyLayout = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/tui/legacy_layout.rs"), "utf8");
  const rustRenderer = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/tui/renderer.rs"), "utf8");

  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIBrandConfig",
    "build-resources/c420ui/src/types.ts must export C420UIBrandConfig",
  );
  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIProjectConfig",
    "build-resources/c420ui/src/types.ts must export C420UIProjectConfig",
  );
  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIConfig",
    "build-resources/c420ui/src/types.ts must export C420UIConfig",
  );
  assertC420UIIncludes(
    failures,
    legacyLayout,
    "LegacyLayout",
    "build-resources/c420ui-rs/src/tui/legacy_layout.rs must own legacy layout math",
  );
  assertC420UIIncludes(
    failures,
    legacyLayout,
    "c420ui_header",
    "Rust legacy layout must keep a dedicated c420ui header area",
  );
  assertC420UIIncludes(
    failures,
    legacyLayout,
    "project_header",
    "Rust legacy layout must keep a dedicated project header area",
  );
  assertC420UIIncludes(
    failures,
    legacyLayout,
    "workspace_top",
    "Rust legacy layout must apply a shared workspace top",
  );
  assertC420UIIncludes(
    failures,
    legacyLayout,
    "LegacyLayoutMode",
    "Rust legacy layout must expose side-by-side/stacked layout mode",
  );

  if (!rustRenderer.includes("format_c420ui_version_line") || !rustRenderer.includes("project_header_lines")) {
    failures.push("Rust renderer must render c420ui and project header content");
  }
}

function checkSourceHashDisplayContract(failures: string[]): void {
  const rootDir = process.cwd();
  const detectionTypes = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/detection.ts"), "utf8");
  const packageTypes = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/types.ts"), "utf8");
  const summary = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/terminal/detected-installations-summary.ts"), "utf8");
  const rustTuiContracts = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-contracts.ts"), "utf8");
  const rustRenderer = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/tui/renderer.rs"), "utf8");
  const rustTuiRunner = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts"), "utf8");
  const builder = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/scripts/c420ui-builder.ts"), "utf8");
  const adapter = fs.readFileSync(path.join(rootDir, "build-resources/canva-linux/c420ui-adapter/adapter.ts"), "utf8");
  const artifactFragments = fs.readFileSync(
    path.join(rootDir, "build-resources/canva-linux/c420ui-adapter/detection/artifact-fragments.ts"),
    "utf8",
  );

  for (const source of [detectionTypes, packageTypes] as const) {
    if (!source.includes("hash?: string") || !source.includes("hashKind?: string")) {
      failures.push("c420ui detection/config types must carry normalized hash and hashKind fields");
    }
  }
  if (!summary.includes("formatShortHash(hash") || !summary.includes("formatDetectedStatus(colors") || !summary.includes("linuxUnpacked?.hash")) {
    failures.push("Detection UI must render a source hash next to detected versions");
  }
  if (!rustTuiContracts.includes("hash: optionalNonEmpty(config.brand.hash)") || !rustRenderer.includes("format_c420ui_version_line") || !rustRenderer.includes("short_hash(hash)")) {
    failures.push("Rust TUI header must render source hashes next to c420ui and project versions");
  }
  if (!rustTuiRunner.includes('writeSession(sessionStream, "[mode] c420ui")')) {
    failures.push("c420ui startup logs must belong to the Rust TUI runner session");
  }
  if (!builder.includes("formatC420UIVersionLabel") || !builder.includes("metadata.c420uiSourceHash")) {
    failures.push("c420ui builder version/help/session log must render c420uiSourceHash next to the builder version");
  }
  if (builder.includes("metadata.canvaLinuxSourceHash") || builder.includes("metadata.combinedSourceHash")) {
    failures.push("c420ui builder version/help/session log must not use Canva Linux or combined source hashes");
  }
  const versionInfo = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/version-info.ts"), "utf8");
  for (const requiredFragment of [
    "C420UIVersionInfo",
    "formatC420UIVersionLabel",
    "shortSourceHash",
    "sourceHash",
  ] as const) {
    if (!versionInfo.includes(requiredFragment)) {
      failures.push(`build-resources/c420ui/src/version-info.ts must keep ${requiredFragment}`);
    }
  }
  if (!adapter.includes("c420uiPackageJsonPath") || !adapter.includes("build-resources/c420ui/package.json")) {
    failures.push("c420ui version renderer must read build-resources/c420ui/package.json");
  }
  if (!artifactFragments.includes('path.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json")')) {
    failures.push("Linux Unpacked must prefer effective build metadata before committed fallback");
  }
  if (!artifactFragments.includes("canvaLinuxSourceHash") || !artifactFragments.includes('hashKind: "canvaLinuxSourceHash"')) {
    failures.push("Linux Unpacked and generated artifacts must display canvaLinuxSourceHash");
  }
  if (!adapter.includes("c420uiSourceHash") || !adapter.includes('hashKind: "c420uiSourceHash"')) {
    failures.push("c420ui version must display c420uiSourceHash");
  }
  if (/loadBrandConfig\(\)[\s\S]*version:\s*(?:loadBuildMetadata\(\)\.)?version/.test(adapter)) {
    failures.push("c420ui version renderer must not use metadata.version as package version");
  }
  if (/loadBrandConfig\(\)[\s\S]*hash:\s*loadBuildMetadata\(\)\.canvaLinuxSourceHash/.test(adapter)) {
    failures.push("c420ui version renderer must not use canvaLinuxSourceHash");
  }
  if (/loadBrandConfig\(\)[\s\S]*hash:\s*loadBuildMetadata\(\)\.combinedSourceHash/.test(adapter)) {
    failures.push("c420ui version renderer must not use combinedSourceHash");
  }
  if (!adapter.includes("combinedSourceHash") || !adapter.includes('combinedHashKind: "combinedSourceHash"')) {
    failures.push("aggregate/build overview must carry combinedSourceHash");
  }
}

function checkSettingsContract(failures: string[]): void {
  const rootDir = process.cwd();
  const settings = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/terminal/settings.ts"), "utf8");
  const rustContracts = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-contracts.ts"), "utf8");
  const rustRunner = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts"), "utf8");

  if (!rustContracts.includes('"settings"') || !rustContracts.includes("Application Settings")) {
    failures.push("build-resources/c420ui/src/rust-tui-contracts.ts: Application Settings view is required");
  }
  if (
    !rustRunner.includes("generalLogsEnabled") ||
    !rustRunner.includes("terminalTextSelectionMode") ||
    !rustRunner.includes("Text selection mode")
  ) {
    failures.push("build-resources/c420ui/src/rust-tui-runner.ts: Rust settings menu must expose persisted tool settings");
  }
  if (!settings.includes("generalLogsEnabled")) {
    failures.push("build-resources/c420ui/src/terminal/settings.ts: generalLogsEnabled setting is required");
  }
  if (!settings.includes("terminalTextSelectionMode")) {
    failures.push(
      "build-resources/c420ui/src/terminal/settings.ts: terminalTextSelectionMode schema entry is required",
    );
  }
  if (
    !settings.includes("XDG_CONFIG_HOME") ||
    !settings.includes(".config") ||
    !settings.includes("tool-settings.json") ||
    !settings.includes("saveToolSettings")
  ) {
    failures.push("build-resources/c420ui/src/terminal/settings.ts: user config file persistence is required");
  }
}


function checkHostDependencyContract(failures: string[]): void {
  const rootDir = process.cwd();
  const requiredFiles = [
    "build-resources/c420ui/src/host-dependencies.ts",
    "build-resources/c420ui/src/command-dependencies.ts",
    "build-resources/c420ui/src/node-dependencies.ts",
    "build-resources/c420ui/src/npm-dependencies.ts",
    "build-resources/c420ui/src/host-dependency-runner.ts",
    "build-resources/c420ui/src/host-dependency-resolver.ts",
    "build-resources/c420ui/src/maintenance-config.ts",
    "build-resources/c420ui/src/rust-host.ts",
    "build-resources/c420ui/src/rust-maintenance.ts",
    "build-resources/c420ui/src/rust-process-runner.ts",
  ] as const;
  const indexPath = "build-resources/c420ui/src/index.ts";

  for (const requiredFile of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, requiredFile))) {
      failures.push(`${requiredFile}: missing c420ui host dependency module`);
    }
  }

  const hostDependenciesPath = "build-resources/c420ui/src/host-dependencies.ts";
  if (!fs.existsSync(path.join(rootDir, hostDependenciesPath))) return;
  const source = fs.readFileSync(path.join(rootDir, hostDependenciesPath), "utf8");
  const index = fs.readFileSync(path.join(rootDir, indexPath), "utf8");
  for (const fragment of [
    "c420uiHostDependencyProvider",
    "c420uiHostDependencyCheckResult",
    "c420uiHostDependencyPurpose",
    "c420uiCommandDependency",
    "c420uiNodeDependencyConfig",
    "c420uiNpmDependencyConfig",
    "c420uiHostDependencyConfig",
    "c420uiHostDependencyEnsureOptions",
    "validateC420UIHostDependencyConfig",
    "assertC420UIHostDependencyConfig",
    "plannedCommand",
    "createC420UIHostDependencyResult",
    "isC420UIHostDependencyFailure",
  ] as const) {
    if (!source.includes(fragment)) {
      failures.push(`${hostDependenciesPath}: missing ${fragment}`);
    }
  }
  for (const exportPath of [
    "./host-dependencies.js",
    "./command-dependencies.js",
    "./node-dependencies.js",
    "./npm-dependencies.js",
    "./host-dependency-runner.js",
    "./host-dependency-resolver.js",
    "./maintenance-config.js",
    "./rust-host.js",
    "./rust-maintenance.js",
    "./rust-process-runner.js",
  ] as const) {
    if (!index.includes(`export * from "${exportPath}"`)) {
      failures.push(`${indexPath}: missing public export for ${exportPath}`);
    }
  }


  const commandDependencies = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/command-dependencies.ts"), "utf8");
  if (!commandDependencies.includes("fs.accessSync") || !commandDependencies.includes("fs.constants.X_OK")) {
    failures.push("build-resources/c420ui/src/command-dependencies.ts: command lookup must require executable files on POSIX hosts");
  }

  const npmDependencies = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/npm-dependencies.ts"), "utf8");
  for (const fragment of [
    "checkC420UINpmDeclaredDependencies",
    "checkC420UINpmInstalledDependencies",
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ] as const) {
    if (!npmDependencies.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/npm-dependencies.ts: missing npm dependency validation fragment ${fragment}`);
    }
  }

  const typesSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/types.ts"), "utf8");
  if (!typesSource.includes("hostDependencies?: c420uiHostDependencyConfig")) {
    failures.push("build-resources/c420ui/src/types.ts: C420UIConfig must expose hostDependencies");
  }
  if (!typesSource.includes("maintenance?: c420uiMaintenanceConfig")) {
    failures.push("build-resources/c420ui/src/types.ts: C420UIConfig must expose maintenance");
  }

  const bridgeSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/bridge.ts"), "utf8");
  if (!bridgeSource.includes("loadHostDependencies?(): c420uiHostDependencyConfig")) {
    failures.push("build-resources/c420ui/src/bridge.ts: C420UIProjectAdapter must expose optional loadHostDependencies");
  }
  if (!bridgeSource.includes("loadMaintenanceConfig?(): c420uiMaintenanceConfig")) {
    failures.push("build-resources/c420ui/src/bridge.ts: C420UIProjectAdapter must expose optional loadMaintenanceConfig");
  }
  if (npmDependencies.includes("spawnSync") || npmDependencies.includes("node:child_process")) {
    failures.push("build-resources/c420ui/src/npm-dependencies.ts: npm ensure must execute through c420ui-host, not spawnSync");
  }
  if (
    !npmDependencies.includes("checkC420UINpmDependencies") ||
    !npmDependencies.includes("checkC420UINpmDeclaredDependencies") ||
    !npmDependencies.includes("installArgs")
  ) {
    failures.push("build-resources/c420ui/src/npm-dependencies.ts: npm policy must remain in TypeScript");
  }

  const runner = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/host-dependency-runner.ts"), "utf8");
  if (!runner.includes("resolveC420UIHostDependencies")) {
    failures.push("build-resources/c420ui/src/host-dependency-runner.ts: host-dependency-runner must use host-dependency-resolver");
  }

  const resolver = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/host-dependency-resolver.ts"), "utf8");
  if (!resolver.includes("runC420UIRustHost")) {
    failures.push("build-resources/c420ui/src/host-dependency-resolver.ts: host-dependency-resolver must call runC420UIRustHost");
  }
  for (const fragment of [
    "checkC420UINpmDependencies",
    "ensureC420UINpmDependencies",
    "planC420UINpmInstallCommand",
  ] as const) {
    if (!resolver.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/host-dependency-resolver.ts: host-dependency-resolver must keep npm policy in TypeScript (${fragment})`);
    }
  }
  if (resolver.includes("./command-dependencies.js") || resolver.includes("./node-dependencies.js")) {
    failures.push("build-resources/c420ui/src/host-dependency-resolver.ts: resolver must not use TypeScript command/node lookup for real host probes");
  }

  const commandRunner = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/command-runner.ts"), "utf8");
  if (commandRunner.includes("node:child_process")) {
    failures.push("build-resources/c420ui/src/command-runner.ts: command-runner.ts must not import node:child_process");
  }
  if (commandRunner.includes("spawnCommand")) {
    failures.push("build-resources/c420ui/src/command-runner.ts: command-runner.ts must not expose spawnCommand fallback");
  }
  if (!commandRunner.includes("runC420UIRustProcess")) {
    failures.push("build-resources/c420ui/src/command-runner.ts: command-runner.ts must use rust-process-runner");
  }

  const rustProcessRunner = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-process-runner.ts"), "utf8");
  if (!rustProcessRunner.includes("run-process") || !rustProcessRunner.includes("runC420UIRustHostJsonLines")) {
    failures.push("build-resources/c420ui/src/rust-process-runner.ts: rust-process-runner.ts must call c420ui-host run-process");
  }
  if (rustProcessRunner.includes("process.env")) {
    failures.push("build-resources/c420ui/src/rust-process-runner.ts: rust-process-runner.ts must not pass process.env wholesale");
  }

  const rustMaintenance = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-maintenance.ts"), "utf8");
  for (const fragment of ["remove-paths", "fix-permissions", "sudo-validate", "runC420UIRustHost"] as const) {
    if (!rustMaintenance.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/rust-maintenance.ts: missing Rust maintenance fragment ${fragment}`);
    }
  }

  for (const sourcePath of requiredFiles) {
    const moduleSource = fs.readFileSync(path.join(rootDir, sourcePath), "utf8");
    for (const forbidden of [
      "Canva Linux",
      "canva-linux",
      "CANVA" + "_",
      "build-resources/canva-linux/config",
      "scripts/" + "ensure-npm-dependencies.sh",
      "scripts/preflight-common.sh",
      "build-resources/canva-linux/c420ui-adapter",
      "scripts/" + "c420ui-" + "canva-linux",
      "electron-builder",
      "@typescript-eslint/parser",
        ] as const) {
      if (moduleSource.includes(forbidden)) {
        failures.push(`${sourcePath}: must not contain project-specific host dependency policy ${forbidden}`);
      }
    }
  }
}


function checkDevelopmentProviderContract(failures: string[]): void {
  const rootDir = process.cwd();
  const providerPath = "build-resources/c420ui/src/development-provider.ts";
  const indexPath = "build-resources/c420ui/src/index.ts";
  const fullProviderPath = path.join(rootDir, providerPath);
  if (!fs.existsSync(fullProviderPath)) {
    failures.push(`${providerPath}: missing generic development provider`);
    return;
  }

  const provider = fs.readFileSync(fullProviderPath, "utf8");
  const index = fs.readFileSync(path.join(rootDir, indexPath), "utf8");
  for (const fragment of [
    "c420uiDevelopmentTaskKind",
    "c420uiDevelopmentTask",
    "c420uiDevelopmentProvider",
    "createC420UIDevelopmentWorkflow",
    "createC420UIDevelopmentWorkflowFromAction",
    "createC420UIDevelopmentWorkflows",
    "validateC420UIDevelopmentConfig",
    "validateC420UIDevelopmentTasks",
    "assertC420UIDevelopmentTaskMatchesAction",
  ] as const) {
    if (!provider.includes(fragment)) {
      failures.push(`${providerPath}: missing development provider fragment ${fragment}`);
    }
  }
  if (!index.includes('from "./development-provider.js"')) {
    failures.push(`${indexPath}: must export ./development-provider`);
  }
  for (const forbidden of [
    "Canva Linux",
    "CANVA" + "_",
    "build-resources/canva-linux/config",
    "build-resources/canva-linux/c420ui-adapter",
  ] as const) {
    if (provider.includes(forbidden)) {
      failures.push(`${providerPath}: must not contain project-specific fragment ${forbidden}`);
    }
  }
}

function checkLinuxHostSudoContract(failures: string[]): void {
  const rootDir = process.cwd();
  const providerPath = "build-resources/c420ui/src/linux-root-provider.ts";
  const operationsPath = "build-resources/c420ui/host/sudo.ts";
  const legacyOperationsPath = "build-resources/c420ui/operations/host/sudo.ts";
  const providerSource = fs.readFileSync(path.join(rootDir, providerPath), "utf8");

  if (fs.existsSync(path.join(rootDir, operationsPath))) {
    failures.push(`${operationsPath} must not exist after Rust host migration`);
  }
  if (fs.existsSync(path.join(rootDir, legacyOperationsPath))) {
    failures.push(`${legacyOperationsPath} must not exist after Rust host migration`);
  }

  for (const fragment of [
    "sudoCommand",
    'args: ["-v"]',
    'args: ["-S", "-v", "-p", ""]',
  ] as const) {
    if (!providerSource.includes(fragment)) {
      failures.push(`${providerPath}: missing sudo provider fragment ${fragment}`);
    }
  }

  for (const forbidden of [
    "CANVA" + "_",
    "canva_",
    "scripts/" + "sudo-common.sh",
    "Canva Linux",
    "sudo-helper.sh",
  ] as const) {
    if (providerSource.includes(forbidden)) {
      failures.push(`c420ui sudo TypeScript must not contain fragment ${forbidden}`);
    }
  }
}

function checkMaintenanceContract(failures: string[]): void {
  const rootDir = process.cwd();
  const cleanPath = "build-resources/c420ui/operations/maintenance/clean-artifacts.ts";
  const fixPath = "build-resources/c420ui/operations/maintenance/fix-build-permissions.ts";
  const adapterPath = "build-resources/canva-linux/c420ui-adapter/adapter.ts";
  const cleanSource = fs.readFileSync(path.join(rootDir, cleanPath), "utf8");
  const fixSource = fs.readFileSync(path.join(rootDir, fixPath), "utf8");
  const adapterSource = fs.readFileSync(path.join(rootDir, adapterPath), "utf8");
  const maintenanceConfig = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/maintenance-config.ts"), "utf8");
  const operationSources = collectTypeScriptFiles(path.join(rootDir, "build-resources/c420ui/operations"));

  if (!adapterSource.includes("loadMaintenanceConfig") || !adapterSource.includes("maintenance.json")) {
    failures.push(`${adapterPath}: adapter must expose dependent project maintenance config`);
  }
  for (const fragment of ["validateC420UIMaintenanceConfig", "cleanupTargets", "permissionTargets"]) {
    if (!maintenanceConfig.includes(fragment)) {
      failures.push(`build-resources/c420ui/src/maintenance-config.ts: missing ${fragment}`);
    }
  }
  if (!cleanSource.includes("runC420UIRustRemovePaths")) {
    failures.push(`${cleanPath}: clean-artifacts must use rust-maintenance remove-paths`);
  }
  if (!cleanSource.includes("runC420UICleanArtifacts")) {
    failures.push(`${cleanPath}: clean-artifacts must export generic runC420UICleanArtifacts`);
  }
  if (cleanSource.includes("node:fs") || cleanSource.includes("fs.rmSync") || cleanSource.includes("runWithOptionalSudo") || cleanSource.includes("loadCanvaLinuxMaintenanceConfig")) {
    failures.push(`${cleanPath}: clean-artifacts must not remove paths directly in TypeScript or import dependent adapters`);
  }
  if (!fixSource.includes("runC420UIRustFixPermissions")) {
    failures.push(`${fixPath}: fix-build-permissions must use rust-maintenance fix-permissions`);
  }
  if (!fixSource.includes("runC420UIFixBuildPermissions")) {
    failures.push(`${fixPath}: fix-build-permissions must export generic runC420UIFixBuildPermissions`);
  }
  if (fixSource.includes("node:fs") || fixSource.includes("c420uiSudoRun") || fixSource.includes("runC420UIRustProcess") || fixSource.includes("loadCanvaLinuxMaintenanceConfig")) {
    failures.push(`${fixPath}: fix-build-permissions must not chown directly in TypeScript or import dependent adapters`);
  }
  for (const target of [".flatpak-builder", "build-dir", "repo"] as const) {
    if (cleanSource.includes(target) || fixSource.includes(target)) {
      failures.push(`maintenance targets must come from dependent project config, not ${target} in c420ui operations`);
    }
  }
  for (const file of operationSources) {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
    const source = fs.readFileSync(file, "utf8");
    for (const forbidden of [
      "loadCanvaLinuxMaintenanceConfig",
      "canva-linux/c420ui-adapter",
      "../../../canva-linux",
      "../../canva-linux",
    ] as const) {
      if (source.includes(forbidden)) {
        failures.push(`${relativePath}: c420ui operations must not import dependent-project adapters or config (${forbidden})`);
      }
    }
  }
}

function checkRustFilesystemOperationsContract(failures: string[]): void {
  const rootDir = process.cwd();
  const preflightPath = "build-resources/c420ui/host/preflight.ts";
  const nativePath = "build-resources/c420ui/operations/install/native.ts";
  const iconsPath = "build-resources/c420ui/operations/install/icons.ts";
  const flatpakPath = "build-resources/c420ui/operations/install/flatpak.ts";
  const appimagePath = "build-resources/c420ui/operations/packaging/appimage.ts";
  const bundlePath = "build-resources/c420ui/operations/packaging/flatpak-bundle.ts";
  const guidancePath = "build-resources/c420ui/operations/host/guidance.ts";
  const rustFsPath = "build-resources/c420ui/src/rust-fs.ts";
  const rustArtifactsPath = "build-resources/c420ui/src/rust-artifacts.ts";
  const rustPreflightPath = "build-resources/c420ui/src/rust-preflight.ts";

  if (fs.existsSync(path.join(rootDir, preflightPath))) {
    failures.push(`${preflightPath} must not exist after Rust host command resolution`);
  }

  const native = fs.readFileSync(path.join(rootDir, nativePath), "utf8");
  const icons = fs.readFileSync(path.join(rootDir, iconsPath), "utf8");
  const flatpak = fs.readFileSync(path.join(rootDir, flatpakPath), "utf8");
  const appimage = fs.readFileSync(path.join(rootDir, appimagePath), "utf8");
  const bundle = fs.readFileSync(path.join(rootDir, bundlePath), "utf8");
  const guidance = fs.readFileSync(path.join(rootDir, guidancePath), "utf8");
  const rustFs = fs.readFileSync(path.join(rootDir, rustFsPath), "utf8");
  const rustArtifacts = fs.readFileSync(path.join(rootDir, rustArtifactsPath), "utf8");
  const rustPreflight = fs.readFileSync(path.join(rootDir, rustPreflightPath), "utf8");

  if (!native.includes("c420uiNativeInstallConfig")) {
    failures.push(`${nativePath}: native install identity and paths must come from validated config`);
  }
  for (const forbidden of [
    "build-resources/canva-linux/config/install-native.json",
    "build-resources/canva-linux/assets/icons",
    "io.github.coletivo420.canva-linux",
    "/opt/canva-linux",
    ".local/opt/canva-linux",
  ] as const) {
    if (native.includes(forbidden)) {
      failures.push(`${nativePath}: native install must not hardcode dependent-project install policy (${forbidden})`);
    }
  }
  if (guidance.includes("Canva Linux") || guidance.includes("canva-linux") || guidance.includes("io.github.coletivo420.canva-linux")) {
    failures.push(`${guidancePath}: post-install guidance must receive dependent-project commands from callers`);
  }
  for (const [label, source] of [
    [nativePath, native],
    [iconsPath, icons],
  ] as const) {
    if (!source.includes("runC420UIRustFsOps")) {
      failures.push(`${label}: filesystem mutations must use rust-fs`);
    }
  }
  if (!flatpak.includes("runC420UIRustEnsureLinuxUnpacked") || !bundle.includes("runC420UIRustEnsureLinuxUnpacked")) {
    failures.push("Flatpak linux-unpacked normalization must use Rust");
  }
  if (!appimage.includes("runC420UIRustArtifactFileOps")) {
    failures.push(`${appimagePath}: AppImage cleanup/find must use Rust artifact ops`);
  }
  if (appimage.includes("canva-linux-")) {
    failures.push(`${appimagePath}: AppImage artifact naming must come from dependent-project config`);
  }
  if (!appimage.includes("runC420UIRustFsOps")) {
    failures.push(`${appimagePath}: AppImage checksum sidecar must use rust-fs`);
  }
  if (!rustFs.includes('command: "fs-ops"') || !rustFs.includes('command: "ensure-linux-unpacked"')) {
    failures.push(`${rustFsPath}: must call c420ui-host fs-ops and ensure-linux-unpacked`);
  }
  if (!rustArtifacts.includes('command: "artifact-file-ops"')) {
    failures.push(`${rustArtifactsPath}: must call c420ui-host artifact-file-ops`);
  }
  if (!rustPreflight.includes("resolveC420UIHostDependencies")) {
    failures.push(`${rustPreflightPath}: must resolve commands through host dependencies`);
  }
  for (const [label, source] of [
    [nativePath, native],
    [flatpakPath, flatpak],
    [appimagePath, appimage],
    [bundlePath, bundle],
  ] as const) {
    if (source.includes("../../host/preflight.js") || source.includes("requireCommands(")) {
      failures.push(`${label}: must not use legacy requireCommands preflight`);
    }
  }
}

function checkRustTuiContract(failures: string[]): void {
  const rootDir = process.cwd();
  const rustTuiPath = "build-resources/c420ui/src/rust-tui-contracts.ts";
  const rustTuiRunnerPath = "build-resources/c420ui/src/rust-tui-runner.ts";
  const cargoPath = "build-resources/c420ui-rs/Cargo.toml";
  const terminalPath = "build-resources/c420ui/src/terminal/index.ts";
  const runtimePath = "build-resources/c420ui/src/terminal/runtime.ts";
  const rustTuiBinPath = "build-resources/c420ui-rs/src/bin/c420ui-tui.rs";
  const rustContractsPath = "build-resources/c420ui-rs/src/tui/contracts.rs";
  const rustRendererPath = "build-resources/c420ui-rs/src/tui/renderer.rs";
  const rustWidgetsPath = "build-resources/c420ui-rs/src/tui/widgets.rs";
  const rustProgressPath = "build-resources/c420ui-rs/src/tui/progress.rs";
  const rustInputPath = "build-resources/c420ui-rs/src/tui/input.rs";
  const rustLegacyLayoutPath = "build-resources/c420ui-rs/src/tui/legacy_layout.rs";
  const rustLegacyThemePath = "build-resources/c420ui-rs/src/tui/legacy_theme.rs";
  const rustTuiRuntimePath = "build-resources/c420ui-rs/src/tui/runtime.rs";
  const rustTuiStatePath = "build-resources/c420ui-rs/src/tui/state.rs";
  const doctorSourcePath = "build-resources/c420ui/scripts/doctor.ts";
  const actionsPath = "build-resources/canva-linux/config/actions.json";
  const roadmapPath = "docs/dev/DEV12_RUST_C420UI_MIGRATION.md";
  const validationPath = "docs/VALIDATION.md";
  const guardrailsPath = "docs/internal/AI_GUARDRAILS.md";
  const packagePath = "package.json";

  if (!fs.existsSync(path.join(rootDir, rustTuiPath))) {
    failures.push(`${rustTuiPath} must exist before c420ui-tui migration`);
    return;
  }
  if (!fs.existsSync(path.join(rootDir, rustTuiRunnerPath))) {
    failures.push(`${rustTuiRunnerPath} must exist once c420ui-tui is the runtime path`);
    return;
  }

  const rustTui = fs.readFileSync(path.join(rootDir, rustTuiPath), "utf8");
  const rustTuiRunner = fs.readFileSync(path.join(rootDir, rustTuiRunnerPath), "utf8");
  const cargo = fs.readFileSync(path.join(rootDir, cargoPath), "utf8");
  const runtime = fs.readFileSync(path.join(rootDir, runtimePath), "utf8");
  const rustTuiBin = fs.readFileSync(path.join(rootDir, rustTuiBinPath), "utf8");
  const rustContracts = fs.readFileSync(path.join(rootDir, rustContractsPath), "utf8");
  const rustRenderer = fs.readFileSync(path.join(rootDir, rustRendererPath), "utf8");
  const rustWidgets = fs.readFileSync(path.join(rootDir, rustWidgetsPath), "utf8");
  const rustProgress = fs.readFileSync(path.join(rootDir, rustProgressPath), "utf8");
  const rustInput = fs.readFileSync(path.join(rootDir, rustInputPath), "utf8");
  const rustLegacyLayout = fs.readFileSync(path.join(rootDir, rustLegacyLayoutPath), "utf8");
  const rustLegacyTheme = fs.readFileSync(path.join(rootDir, rustLegacyThemePath), "utf8");
  const rustTuiRuntime = fs.readFileSync(path.join(rootDir, rustTuiRuntimePath), "utf8");
  const rustTuiState = fs.readFileSync(path.join(rootDir, rustTuiStatePath), "utf8");
  const doctorSource = fs.existsSync(path.join(rootDir, doctorSourcePath))
    ? fs.readFileSync(path.join(rootDir, doctorSourcePath), "utf8")
    : "";
  const actions = fs.readFileSync(path.join(rootDir, actionsPath), "utf8");
  const roadmap = fs.readFileSync(path.join(rootDir, roadmapPath), "utf8");
  const validation = fs.readFileSync(path.join(rootDir, validationPath), "utf8");
  const guardrails = fs.readFileSync(path.join(rootDir, guardrailsPath), "utf8");
  const packageJson = fs.readFileSync(path.join(rootDir, packagePath), "utf8");

  if (!cargo.includes('name = "c420ui-tui"') || !cargo.includes('path = "src/bin/c420ui-tui.rs"')) {
    failures.push(`${cargoPath}: c420ui-tui binary must be declared explicitly`);
  }
  if (!fs.existsSync(path.join(rootDir, terminalPath))) {
    failures.push(`${terminalPath}: TypeScript terminal UI must remain until direct replacement phase`);
  }
  for (const [label, source] of [
    [rustTuiPath, rustTui],
    [rustTuiRunnerPath, rustTuiRunner],
    [runtimePath, runtime],
    [packagePath, packageJson],
    [roadmapPath, roadmap],
    [validationPath, validation],
    [guardrailsPath, guardrails],
  ] as const) {
    if (source.includes("C420UI_" + "TUI_BACKEND")) {
      failures.push(`${label}: must not introduce an optional c420ui-tui backend switch`);
    }
  }
  if (rustTui.includes("runC420UIRustHost") || rustTui.includes("c420ui-tui")) {
    failures.push(`${rustTuiPath}: contract bridge must not execute c420ui-tui directly`);
  }
  if (!runtime.includes("runC420UIRustTuiApp")) {
    failures.push(`${runtimePath}: runC420UITerminalApp must route through c420ui-tui`);
  }
  if (!rustTuiRunner.includes('"run"') || !rustTuiRunner.includes('"--json-lines"') || !rustTuiRunner.includes("c420ui-tui")) {
    failures.push(`${rustTuiRunnerPath}: must start c420ui-tui run --json-lines`);
  }
  if (!doctorSource) {
    failures.push(`${doctorSourcePath}: Doctor source script must exist`);
  }
  for (const fragment of ["c420ui-host", "host-info", "doctor", "check-host-dependencies"] as const) {
    if (!doctorSource.includes(fragment)) {
      failures.push(`${doctorSourcePath}: Doctor script must call c420ui-host ${fragment}`);
    }
  }
  if (!actions.includes('"id": "doctor"') || !actions.includes('".build/scripts/doctor.mjs"')) {
    failures.push(`${actionsPath}: Doctor action must target generated doctor script`);
  }
  if (!rustTuiRunner.includes("createC420UIActionEngine")) {
    failures.push(`${rustTuiRunnerPath}: TypeScript Action Engine must remain the execution owner`);
  }
  if (!rustTuiRuntime.includes("ActionSelected") || !rustTuiRuntime.includes("action_id")) {
    failures.push(`${rustTuiRuntimePath}: c420ui-tui must emit action-selected events instead of executing actions`);
  }
  if (rustTuiRuntime.includes("runAction") || rustTuiBin.includes("runAction")) {
    failures.push("c420ui-tui must not execute project actions directly");
  }
  if (!cargo.includes("ratatui") || !cargo.includes("crossterm")) {
    failures.push(`${cargoPath}: c420ui-tui must use ratatui/crossterm for the runtime renderer`);
  }
  if (!rustTuiBin.includes("render_smoke::render") || rustTuiRuntime.includes("render_smoke::render")) {
    failures.push("c420ui-tui must keep plain JSON render smoke out of the runtime visual renderer");
  }
  for (const label of [
    "Main Menu",
    "Detected Installations",
    "Generated Artifacts",
    "Linux Artifacts",
    "Overview",
    "Logs",
  ] as const) {
    if (!rustTui.includes(label) && !rustWidgets.includes(label) && !rustRenderer.includes(label)) {
      failures.push(`tui renderer contract must preserve legacy panel label: ${label}`);
    }
  }
  if (
    !(
      (rustLegacyLayout.includes("Percentage(32)") && rustLegacyLayout.includes("Percentage(68)")) ||
      (rustLegacyLayout.includes("* 0.32") && rustLegacyLayout.includes("* 0.68"))
    )
  ) {
    failures.push(`${rustLegacyLayoutPath}: must implement the legacy 32/68 layout split`);
  }
  for (const fragment of [
    "menu_selected_bg",
    "menu_inactive_selected_bg",
    "active_border",
    "footer_bg",
  ] as const) {
    if (!rustLegacyTheme.includes(fragment)) {
      failures.push(`${rustLegacyThemePath}: must map legacy theme color ${fragment}`);
    }
  }
  for (const fragment of [
    "view:",
    "focusZone:",
    "panels:",
    "footer:",
    "theme:",
    "modal?:",
  ] as const) {
    if (!rustTui.includes(fragment)) {
      failures.push(`${rustTuiPath}: render contract must include ${fragment}`);
    }
  }
  for (const fragment of [
    "pub view: TuiView",
    "pub focus_zone: TuiFocusZone",
    "pub panels: TuiPanels",
    "pub footer: TuiFooter",
    "pub theme: TuiTheme",
  ] as const) {
    if (!rustContracts.includes(fragment) && !rustTuiRuntime.includes(fragment) && !rustTuiRunner.includes(fragment)) {
      failures.push(`Rust TUI/root contract must include ${fragment}`);
    }
  }
  if (!rustTuiRunner.includes("input?: string") || !rustTuiRunner.includes("validateRootAccessWithInput")) {
    failures.push(`${rustTuiRunnerPath}: root-request-response must support secret input validation`);
  }
  for (const [fragment, message] of [
    ["CopyLogs", "c420ui-tui must support F5/copy-logs event"],
    ["SettingToggle", "c420ui-tui must support setting-toggle event"],
    ["TuiInputEvent::Help", "c420ui-tui must support help shortcut"],
    ["PageUp", "c420ui-tui must support scroll keys"],
    ["menu_scroll", "c420ui-tui must preserve panel scroll state"],
    ["InterruptAction", "c420ui-tui must support interrupt-action modal"],
  ] as const) {
    if (!rustTuiRuntime.includes(fragment) && !rustTuiState.includes(fragment) && !rustWidgets.includes(fragment) && !rustTuiRunner.includes(fragment)) {
      failures.push(message);
    }
  }
  for (const [fragment, message] of [
    ["MAX_LOG_HISTORY_LINES", "rust-tui-runner must preserve bounded log history"],
    ["copyTextToClipboard", "rust-tui-runner must process copy-logs"],
    ["saveToolSettings", "rust-tui-runner must persist setting-toggle"],
    ["Root authentication failed", "rust-tui-runner must retry root input without logging secrets"],
    ["renderState(getCurrentView())", "rust-tui-runner must refresh panels after actions without losing view"],
    ['path.join("/tmp", "c420ui", "tool-session.log")', "session log default must use /tmp/c420ui/tool-session.log"],
    ['".tmp"', "session log fallback must use ~/.tmp/c420ui/tool-session.log"],
  ] as const) {
    if (!rustTuiRunner.includes(fragment)) {
      failures.push(`${rustTuiRunnerPath}: ${message}`);
    }
  }
  if (!rustWidgets.includes("Tool | ") || !rustWidgets.includes("Action | ")) {
    failures.push(`${rustWidgetsPath}: logs must preserve legacy Tool | and Action | prefixes`);
  }
  if (!rustProgress.includes('"█"') || !rustProgress.includes('"░"')) {
    failures.push(`${rustWidgetsPath}: progress must preserve the legacy filled/empty cell glyphs`);
  }
  if (!rustInput.includes("MouseEventKind::ScrollUp") || !rustInput.includes("MouseEventKind::ScrollDown")) {
    failures.push(`${rustInputPath}: Rust TUI must support mouse scroll`);
  }
  if (!rustProgress.includes('"warning"') || !rustProgress.includes("theme.warning") || rustProgress.includes('"success" | "warning"')) {
    failures.push(`${rustProgressPath}: progress warning must not use success color`);
  }
  if (!rustWidgets.includes("styled_status_line") || !rustWidgets.includes("status_value_style")) {
    failures.push(`${rustWidgetsPath}: panel status renderer must color only values, not labels`);
  }
  if (!rustWidgets.includes("Wrap { trim: false }")) {
    failures.push(`${rustWidgetsPath}: Linux Artifacts and scrollable panels must use wrapping`);
  }
  if (rustTuiRunner.includes('".local", "state"') || rustTuiRunner.includes('stateDirectoryName, "tool-session.log"')) {
    failures.push(`${rustTuiRunnerPath}: session log default must not use canva-linux/local-state namespace`);
  }
  if (
    !rustWidgets.includes("Administrator authorization") &&
    !rustTuiRuntime.includes("Administrator authorization") &&
    !rustTuiState.includes("Administrator authorization")
  ) {
    failures.push("c420ui-tui root prompt must render the legacy administrator authorization modal");
  }
  for (const [label, source] of [
    [roadmapPath, roadmap],
    [validationPath, validation],
    [guardrailsPath, guardrails],
  ] as const) {
    const normalized = source.toLowerCase();
    if (!normalized.includes("direct") || !normalized.includes("no experimental")) {
      failures.push(`${label}: docs must describe direct c420ui-tui migration with no experimental backend`);
    }
  }
}

function checkRustMigrationTestContract(failures: string[]): void {
  const rootDir = process.cwd();
  const tests = collectTestSources(rootDir);
  const forbiddenBackend = ["C420UI", "TUI", "BACKEND"].join("_");

  for (const { relativePath, source } of tests) {
    if (source.includes(forbiddenBackend)) {
      failures.push(`${relativePath}: tests must not reference the removed optional TUI backend switch`);
    }
    if (
      /includes blessed runtime terminfo assets|blessed runtime assets match installed blessed package|node_modules\/blessed\/usr/.test(
        source,
      )
    ) {
      failures.push(`${relativePath}: tests must not expect Blessed assets as runtime contract`);
    }
    if (
      source.includes('".local", "state"') ||
      source.includes("~/.local/state/canva-linux/tool-session.log") ||
      source.includes("stateDirectoryName, \"tool-session.log\"")
    ) {
      failures.push(`${relativePath}: tests must not expect legacy local-state session logs`);
    }
    if (/from\s+["'][^"']*build-resources\/c420ui\/host\/(?:sudo|command-runner)\.ts["']/.test(source)) {
      failures.push(`${relativePath}: tests must not import removed host/sudo or host/command-runner paths`);
    }
  }

  const doctorSourcePath = path.join(rootDir, "build-resources/c420ui/scripts/doctor.ts");
  const doctorSource = fs.existsSync(doctorSourcePath) ? fs.readFileSync(doctorSourcePath, "utf8") : "";
  if (doctorSource.includes("spawnSync") || /\/bin\/bash|bash -lc|sh -c/.test(doctorSource)) {
    failures.push("build-resources/c420ui/scripts/doctor.ts: Doctor must delegate to c420ui-host without legacy sync shell runners");
  }
}

export function main(): number {
  const failures: string[] = [];

  runBoundaryContract(failures);
  runDependentProjectBoundaryContract(failures);
  runPackagePolicyContract(failures);
  runPublicApiExportsContract(failures);
  checkMaintenanceContract(failures);
  checkRustFilesystemOperationsContract(failures);
  checkRustTuiContract(failures);
  checkRustMigrationTestContract(failures);
  runBridgeContract(failures);
  runDetectionContract(failures);
  runActionValidationContract(failures);
  runActionEngineContract(failures);
  runCliContract(failures);
  runRootProviderContract(failures);
  runCommandRunnerContract(failures);
  runOperationalLogsContract(failures);
  runArtifactWorkflowContract(failures);
  runInteractiveActionEngineContract(failures);
  checkSettingsContract(failures);
  checkDevelopmentProviderContract(failures);
  checkLinuxHostSudoContract(failures);
  checkHostDependencyContract(failures);
  checkTerminalUiContract(failures);
  checkHeaderLayoutContract(failures);
  checkSourceHashDisplayContract(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] OK");
  return 0;
}

if (/check-c420ui-core-contracts\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-core-contracts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
