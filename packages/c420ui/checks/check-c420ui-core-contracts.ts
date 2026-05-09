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

const checkBoundaryContract = (() => {
const forbidden = [
  "Canva Linux",
  "CANVA LINUX",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "https://github.com/coletivo420/canva-linux",
  "CL-EyeDropper",
  "scripts/",
  "config/canva-linux",
  "project-ui.json",
  "actions.json",
  "app-identity-common.sh",
  "run-core-entry.sh",
  "sudo-common.sh",
  "CANVA_",
];

function readSource(rootDir: string): string {
  const srcDir = path.join(rootDir, "packages/c420ui/src");
  return collectTypeScriptFiles(srcDir)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

function main(): number {
  const rootDir = process.cwd();
  const source = readSource(rootDir);
  const failures = forbidden
    .filter((fragment) => source.includes(fragment))
    .map((fragment) => `packages/c420ui/src must not hardcode ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] boundary OK");
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
    fs.readFileSync(path.join(rootDir, "packages/c420ui/package.json"), "utf8"),
  ) as PackageJson;
  const failures: string[] = [];
  if (pkg.name !== "@coletivo420/c420ui") failures.push("package name must remain scoped");
  if (pkg.private !== true) failures.push("package must remain private");
  if (pkg.type !== "commonjs") failures.push("package must remain CommonJS-compatible");
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
  const srcDir = path.join(rootDir, "packages/c420ui/src");
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
    "capabilities.ts",
    "cli.ts",
    "command-runner.ts",
    "events.ts",
    "exit-codes.ts",
    "operational-logs.ts",
    "root-provider.ts",
    "types.ts",
    "workflow-runner.ts",
    "workflows.ts",
  ];
  const index = fs.readFileSync(path.join(srcDir, "index.ts"), "utf8");
  for (const file of expected) {
    if (!fs.existsSync(path.join(srcDir, file))) failures.push(`missing ${file}`);
  }
  for (const moduleName of expected.map((file) => `./${file.replace(/\.ts$/, "")}`)) {
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
  const detectionPath = "packages/c420ui/src/detection.ts";
  const indexPath = "packages/c420ui/src/index.ts";
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

  if (!index.includes('from "./detection"')) {
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

const checkBridgeContractRunner = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const bridge = read(rootDir, "packages/c420ui/src/bridge.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
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
    "export type * from \"./bridge\"",
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
  const actions = read(rootDir, "packages/c420ui/src/actions.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
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
  const actionEngine = read(rootDir, "packages/c420ui/src/action-engine.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
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
    "config/canva-linux/actions.json",
  ];
  const failures = [
    ...required
      .filter((fragment) => !actionEngine.includes(fragment))
      .map((fragment) => `missing action engine contract fragment: ${fragment}`),
    ...forbidden
      .filter((fragment) => actionEngine.includes(fragment))
      .map((fragment) => `action engine must not contain project-specific fragment: ${fragment}`),
  ];

  if (!index.includes('export { createC420UIActionEngine } from "./action-engine"')) {
    failures.push("index must export createC420UIActionEngine");
  }
  if (!index.includes('} from "./action-engine"')) {
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
  const cli = read(rootDir, "packages/c420ui/src/cli.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
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

  if (!index.includes('export { runC420UICli } from "./cli"')) {
    failures.push("index must export runC420UICli");
  }
  if (!index.includes('export type { c420uiCliOptions, c420uiCliResult } from "./cli"')) {
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
  const rootProvider = read(rootDir, "packages/c420ui/src/root-provider.ts");
  const actionEngine = read(rootDir, "packages/c420ui/src/action-engine.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "c420uiRootProvider",
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
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

  if (!index.includes('export type * from "./root-provider"')) {
    failures.push("index must export root provider types");
  }
  if (!index.includes('c420uiRootPolicyExitCode')) {
    failures.push("index must export c420uiRootPolicyExitCode");
  }
  if (!actionEngine.includes("rootPolicy.warning")) {
    failures.push("action engine must emit root policy warnings");
  }
  const bridge = read(rootDir, "packages/c420ui/src/bridge.ts");
  if (bridge.includes("C420UISudoProvider")) {
    failures.push("bridge must not expose C420UISudoProvider separately from c420uiRootProvider");
  }
  if (rootProvider.includes("sudo-common.sh") || actionEngine.includes("sudo")) {
    failures.push("c420ui core must not call sudo directly");
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
  const runner = read(rootDir, "packages/c420ui/src/command-runner.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  const failures: string[] = [];

  for (const fragment of [
    "runC420UICommand",
    "c420uiCommandRunnerOptions",
    "StringDecoder",
    "emitLog",
    "emitProgress",
    "shell: false",
    "createC420UIOperationalLogEvent",
    "cancelKillTimeoutMs",
    "Cancel requested",
    "SIGINT",
    "SIGTERM",
    'stdio: ["ignore", "pipe", "pipe"]',
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`command runner must include contract fragment: ${fragment}`);
    }
  }

  if (!index.includes('export { runC420UICommand } from "./command-runner"')) {
    failures.push("index must export runC420UICommand");
  }
  if (!index.includes('export type { c420uiCommandRunnerOptions } from "./command-runner"')) {
    failures.push("index must export c420uiCommandRunnerOptions");
  }
  if (app.includes('from "./process-runner"') || app.includes("from './process-runner'")) {
    failures.push("interactive app must not import ./process-runner");
  }
  if (fs.existsSync(path.join(rootDir, "packages/c420ui/src/terminal/process-runner.ts"))) {
    failures.push("packages/c420ui/src/terminal/process-runner.ts must not exist after command runner migration");
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
  const operationalLogs = read(rootDir, "packages/c420ui/src/operational-logs.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
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

  if (!index.includes('from "./operational-logs"')) {
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
  const artifacts = read(rootDir, "packages/c420ui/src/artifacts.ts");
  const workflows = read(rootDir, "packages/c420ui/src/workflows.ts");
  const workflowRunnerPath = "packages/c420ui/src/workflow-runner.ts";
  const workflowRunner = read(rootDir, workflowRunnerPath);
  const required = [
    "c420uiArtifactKind",
    "c420uiArtifactScope",
    "c420uiArtifactWorkflow",
    "buildActionId",
    "validateActionId",
    "installActionId",
    "uninstallActionId",
    "purgeActionId",
    "releaseActionId",
    "custom",
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
    "Canva Linux",
    "canva-linux",
    "bundle-appimage",
    "bundle-flatpak",
    "install-flatpak-system",
    "createCanvaLinux",
    "c420ui-canva-linux",
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
  const app = read(rootDir, "packages/c420ui/src/terminal/app.ts");
  const runner = read(rootDir, "packages/c420ui/src/terminal/interactive-action-runner.ts");
  const bridge = read(rootDir, "packages/c420ui/src/bridge.ts");
  const failures: string[] = [];

  for (const fragment of [
    "createC420UIActionEngine",
    "createInteractiveActionRunner",
    "rootProvider?: c420uiRootProvider",
    "bridge: c420uiProjectBridge",
  ]) {
    if (!app.includes(fragment)) {
      failures.push(`interactive app must include action engine fragment: ${fragment}`);
    }
  }
  for (const fragment of [
    "createC420UIActionEngine",
    "engine.runAction(action",
    "requiresC420UIActionConfirmation",
    "AbortController",
    "signal: abortController.signal",
    "function cancel()",
    "Action canceled before execution",
    'setProgress("canceled",',
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`interactive action runner must include action engine fragment: ${fragment}`);
    }
  }

  if (app.includes('from "./process-runner"') || app.includes("from './process-runner'")) {
    failures.push("interactive app must not import ./process-runner");
  }
  if (app.includes("scripts/run-core-entry.sh ${runnerArgs")) {
    failures.push("interactive app must not route actions through the legacy action-runner path");
  }
  if (app.includes("sudo-common.sh")) {
    failures.push("interactive app must not call sudo-common.sh directly");
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
  const terminalDir = path.join(rootDir, "packages/c420ui/src/terminal");
  const required = [
    "app.ts",
    "index.ts",
    "interactive-action-runner.ts",
    "logo.ts",
    "settings.ts",
    "theme.ts",
    "modal.ts",
    "clipboard.ts",
  ];
  for (const file of required) {
    if (!fs.existsSync(path.join(terminalDir, file))) {
      failures.push(`packages/c420ui/src/terminal/${file}: missing terminal UI file`);
    }
  }
  if (fs.existsSync(path.join(rootDir, "scripts/c420ui"))) {
    failures.push("scripts/c420ui must not exist");
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
    "scripts/c420ui-canva-linux",
    "scripts/sudo-common.sh",
  ]) {
    if (terminalSource.includes(fragment)) {
      failures.push(`packages/c420ui/src/terminal must not contain ${fragment}`);
    }
  }
  const app = fs.existsSync(path.join(terminalDir, "app.ts"))
    ? fs.readFileSync(path.join(terminalDir, "app.ts"), "utf8")
    : "";
  if (!app.includes("bridge.overviewStatus")) {
    failures.push("packages/c420ui/src/terminal/app.ts must use bridge.overviewStatus");
  }
  if (!app.includes("createC420UIActionEngine")) {
    failures.push("packages/c420ui/src/terminal/app.ts must use createC420UIActionEngine");
  }
  if (app.includes("spawn(")) {
    failures.push("packages/c420ui/src/terminal/app.ts must not spawn overview diagnostics");
  }
}

function checkHeaderLayoutContract(failures: string[]): void {
  const rootDir = process.cwd();
  const app = fs.readFileSync(path.join(rootDir, "packages/c420ui/src/terminal/app.ts"), "utf8");
  const packageTypes = fs.readFileSync(path.join(rootDir, "packages/c420ui/src/types.ts"), "utf8");
  const index = fs.readFileSync(path.join(rootDir, "packages/c420ui/src/terminal/index.ts"), "utf8");

  assertC420UIIncludes(
    failures,
    index,
    "createApp",
    "packages/c420ui/src/terminal/index.ts must export createApp",
  );
  assertC420UIIncludes(
    failures,
    app,
    "export type HeaderLayout",
    "packages/c420ui/src/terminal/app.ts must export HeaderLayout",
  );
  assertC420UIIncludes(
    failures,
    app,
    "../action-engine",
    "packages/c420ui/src/terminal/app.ts must import c420ui internals directly",
  );

  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIBrandConfig",
    "packages/c420ui/src/types.ts must export C420UIBrandConfig",
  );
  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIProjectConfig",
    "packages/c420ui/src/types.ts must export C420UIProjectConfig",
  );
  assertC420UIIncludes(
    failures,
    packageTypes,
    "export type C420UIConfig",
    "packages/c420ui/src/types.ts must export C420UIConfig",
  );
  assertC420UIIncludes(
    failures,
    app,
    "computeHeaderLayout",
    "packages/c420ui/src/terminal/app.ts must centralize header layout math",
  );
  assertC420UIIncludes(
    failures,
    app,
    "c420uiHeader",
    "packages/c420ui/src/terminal/app.ts must keep a dedicated c420uiHeader component",
  );
  assertC420UIIncludes(
    failures,
    app,
    "projectHeader",
    "packages/c420ui/src/terminal/app.ts must keep a dedicated projectHeader component",
  );
  assertC420UIIncludes(
    failures,
    app,
    "workspaceTop",
    "packages/c420ui/src/terminal/app.ts must apply a shared workspaceTop",
  );
  assertC420UIIncludes(
    failures,
    app,
    "layoutMode",
    "packages/c420ui/src/terminal/app.ts must expose side-by-side/stacked layoutMode",
  );

  const focusZones = app.match(/const FOCUS_ZONES:[^=]+=\s*\[([^\]]+)\]/);
  if (!focusZones) {
    failures.push("packages/c420ui/src/terminal/app.ts must keep explicit FOCUS_ZONES");
  } else if (
    focusZones[1]?.includes("c420uiHeader") ||
    focusZones[1]?.includes("projectHeader")
  ) {
    failures.push("headers must not be included in FOCUS_ZONES");
  }

  if (app.includes("const brandHeader")) {
    failures.push("c420ui brand header component must be named c420uiHeader");
  }
  if (!app.includes("content: [\n      `{bold}${opts.brand.name}")) {
    failures.push("c420uiHeader content must come from brand config");
  }
  if (!app.includes("content: [\n      `{bold}${opts.project.projectName}")) {
    failures.push("projectHeader content must come from project config");
  }
}

function checkSettingsContract(failures: string[]): void {
  const rootDir = process.cwd();
  const app = fs.readFileSync(path.join(rootDir, "packages/c420ui/src/terminal/app.ts"), "utf8");
  const settings = fs.readFileSync(path.join(rootDir, "packages/c420ui/src/terminal/settings.ts"), "utf8");

  if (!app.includes('"settings"') || !app.includes("Application Settings")) {
    failures.push("packages/c420ui/src/terminal/app.ts: Application Settings view is required");
  }
  if (!app.includes("generalLogsEnabled") || !app.includes("Install and Development Tool")) {
    failures.push("packages/c420ui/src/terminal/app.ts: general Tool logs setting is required");
  }
  if (!settings.includes("generalLogsEnabled")) {
    failures.push("packages/c420ui/src/terminal/settings.ts: generalLogsEnabled setting is required");
  }
  if (!settings.includes("terminalTextSelectionMode")) {
    failures.push(
      "packages/c420ui/src/terminal/settings.ts: terminalTextSelectionMode schema entry is required",
    );
  }
  if (
    !settings.includes("XDG_CONFIG_HOME") ||
    !settings.includes(".config") ||
    !settings.includes("tool-settings.json") ||
    !settings.includes("saveToolSettings")
  ) {
    failures.push("packages/c420ui/src/terminal/settings.ts: user config file persistence is required");
  }
}

export function main(): number {
  const failures: string[] = [];

  runBoundaryContract(failures);
  runPackagePolicyContract(failures);
  runPublicApiExportsContract(failures);
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
  checkTerminalUiContract(failures);
  checkHeaderLayoutContract(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-core-contracts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
