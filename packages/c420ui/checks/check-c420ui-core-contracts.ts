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

const checkBoundaryPart = (() => {
const forbidden = [
  "Canva Linux",
  "CANVA LINUX",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "https://github.com/coletivo420/canva-linux",
  "CL-EyeDropper",
  "scripts/",
  "project-ui.json",
  "actions.json",
  "app-identity-common.sh",
  "run-core-entry.sh",
  "sudo-common.sh",
  "CANVA_",
];

function collectTypeScriptFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(entryPath);
    if (entry.isFile() && entry.name.endsWith(".ts")) return [entryPath];
    return [];
  });
}

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
  console.log("[c420ui-boundary] OK");
  return 0;
}

  return { main };
})();

const checkPackagePolicyPart = (() => {
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
  console.log("[c420ui-package-policy] OK");
  return 0;
}

  return { main };
})();

const checkPublicApiExportsPart = (() => {
function main(): number {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "packages/c420ui/src");
  const failures: string[] = [];
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".ts")) continue;
    if (!/^[a-z0-9-]+\.ts$/.test(file)) failures.push(`${file}: source file names must be kebab-case`);
  }
  const expected = [
    "actions.ts",
    "artifacts.ts",
    "bridge.ts",
    "capabilities.ts",
    "events.ts",
    "exit-codes.ts",
    "workflows.ts",
  ];
  for (const file of expected) {
    if (!fs.existsSync(path.join(srcDir, file))) failures.push(`missing ${file}`);
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-naming] OK");
  return 0;
}

  return { main };
})();

const checkBridgeContractPart = (() => {
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
    "createC420UIBridge",
    "export type * from \"./bridge\"",
  ];
  const failures = required
    .filter((fragment) => !bridge.includes(fragment) && !index.includes(fragment))
    .map((fragment) => `missing bridge contract fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-bridge-contract] OK");
  return 0;
}

  return { main };
})();

const checkActionEnginePart = (() => {
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
    "scripts/actions.json",
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
  console.log("[c420ui-action-engine-contract] OK");
  return 0;
}

  return { main };
})();

const checkCliContractPart = (() => {
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
  console.log("[c420ui-cli-contract] OK");
  return 0;
}

  return { main };
})();

const checkRootProviderPart = (() => {
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
  console.log("[c420ui-root-provider-contract] OK");
  return 0;
}

  return { main };
})();

const checkCommandRunnerPart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const runner = read(rootDir, "packages/c420ui/src/command-runner.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const adapter = read(rootDir, "scripts/c420ui-canva-linux/adapter.ts");
  const app = read(rootDir, "scripts/c420ui/app.ts");
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
  if (!adapter.includes("const actionEnv = context.env")) {
    failures.push("Canva Linux adapter must use the Action Engine/root provider prepared context.env");
  }
  if (adapter.includes("...context.env, ...(action.env")) {
    failures.push("Canva Linux adapter must not merge action.env after context.env preparation");
  }
  if (!adapter.includes("runC420UICommand({")) {
    failures.push("Canva Linux adapter must delegate command execution to runC420UICommand");
  }
  if (adapter.includes("spawn(")) {
    failures.push("Canva Linux adapter must not reimplement generic spawn handling");
  }
  if (app.includes('from "./process-runner"') || app.includes("from './process-runner'")) {
    failures.push("interactive app must not import ./process-runner");
  }
  if (fs.existsSync(path.join(rootDir, "scripts/c420ui/process-runner.ts"))) {
    failures.push("scripts/c420ui/process-runner.ts must not exist after command runner migration");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-command-runner-contract] OK");
  return 0;
}

  return { main };
})();

const checkOperationalLogsPart = (() => {
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
  console.log("[c420ui-operational-logs-contract] OK");
  return 0;
}

  return { main };
})();

const checkArtifactWorkflowsPart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const artifacts = read(rootDir, "packages/c420ui/src/artifacts.ts");
  const workflows = read(rootDir, "packages/c420ui/src/workflows.ts");
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
  ];
  const source = `${artifacts}\n${workflows}`;
  const failures = required
    .filter((fragment) => !source.includes(fragment))
    .map((fragment) => `missing artifact/workflow contract fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-artifact-workflow-contract] OK");
  return 0;
}

  return { main };
})();

const checkInteractiveActionEnginePart = (() => {
function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function main(): number {
  const rootDir = process.cwd();
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const run = read(rootDir, "scripts/c420ui-canva-linux/run.ts");
  const runner = read(rootDir, "scripts/c420ui/interactive-action-runner.ts");
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
  if (!run.includes("createCanvaLinuxRootProvider")) {
    failures.push("Canva Linux c420ui run path must import createCanvaLinuxRootProvider");
  }
  if (!run.includes("rootProvider: createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux c420ui run path must pass rootProvider to createApp");
  }
  if (bridge.includes("C420UISudoProvider")) {
    failures.push("bridge contract must not reintroduce C420UISudoProvider");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-interactive-action-engine-contract] OK");
  return 0;
}

  return { main };
})();

function checkBoundary(failures: string[]): void {
  runCheck(failures, { name: "boundary", run: checkBoundaryPart.main });
}

function checkPackagePolicy(failures: string[]): void {
  runCheck(failures, { name: "package policy", run: checkPackagePolicyPart.main });
}

function checkPublicApiExports(failures: string[]): void {
  runCheck(failures, { name: "public API exports", run: checkPublicApiExportsPart.main });
}

function checkBridgeContract(failures: string[]): void {
  runCheck(failures, { name: "bridge contract", run: checkBridgeContractPart.main });
}

function checkActionEngine(failures: string[]): void {
  runCheck(failures, { name: "action engine", run: checkActionEnginePart.main });
}

function checkCliContract(failures: string[]): void {
  runCheck(failures, { name: "CLI contract", run: checkCliContractPart.main });
}

function checkRootProvider(failures: string[]): void {
  runCheck(failures, { name: "root provider", run: checkRootProviderPart.main });
}

function checkCommandRunner(failures: string[]): void {
  runCheck(failures, { name: "command runner", run: checkCommandRunnerPart.main });
}

function checkOperationalLogs(failures: string[]): void {
  runCheck(failures, { name: "operational logs", run: checkOperationalLogsPart.main });
}

function checkArtifactWorkflows(failures: string[]): void {
  runCheck(failures, { name: "artifact workflows", run: checkArtifactWorkflowsPart.main });
}

function checkInteractiveActionEngine(failures: string[]): void {
  runCheck(failures, { name: "interactive action engine", run: checkInteractiveActionEnginePart.main });
}

export function main(): number {
  const failures: string[] = [];

  checkBoundary(failures);
  checkPackagePolicy(failures);
  checkPublicApiExports(failures);
  checkBridgeContract(failures);
  checkActionEngine(failures);
  checkCliContract(failures);
  checkRootProvider(failures);
  checkCommandRunner(failures);
  checkOperationalLogs(failures);
  checkArtifactWorkflows(failures);
  checkInteractiveActionEngine(failures);

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
