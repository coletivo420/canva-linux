import fs from "node:fs";
import path from "node:path";
import type { c420uiLogEvent, c420uiProgressEvent } from "./events.js";
import type {
  c420uiHostDependency,
  c420uiHostDependencyCheckResult,
  c420uiNpmDependencyConfig,
  c420uiPlannedHostDependencyCommand,
} from "./host-dependencies.js";
import { runC420UIRustProcess } from "./rust-process-runner.js";

export type c420uiNpmCommandRunner = (
  options: {
    rootDir: string;
    command: string;
    args: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    label: string;
    emitLog?: (event: c420uiLogEvent) => void;
    emitProgress?: (event: c420uiProgressEvent) => void;
  },
) => Promise<c420uiHostDependencyCheckResult>;

type PackageJson = {
  scripts?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
};

function readPackageJson(rootDir: string): { packageJson?: PackageJson; result?: c420uiHostDependencyCheckResult } {
  const packagePath = path.join(rootDir, "package.json");
  if (!fs.existsSync(packagePath)) {
    return { result: { status: "failed", exitCode: 1, message: "package.json was not found." } };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as PackageJson;
    return { packageJson };
  } catch (error) {
    return {
      result: {
        status: "failed",
        exitCode: 1,
        message: `package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
      },
    };
  }
}

function validatePackageScripts(packageJson: PackageJson): c420uiHostDependencyCheckResult | undefined {
  const scripts = packageJson.scripts ?? {};
  const failures: string[] = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") {
      failures.push(`scripts.${name} must be a string`);
    } else if (/\r|\n/.test(command)) {
      failures.push(`scripts.${name} must stay on one line`);
    }
  }

  if (failures.length > 0) {
    return {
      status: "failed",
      exitCode: 1,
      message: `package.json contains invalid npm scripts: ${failures.join("; ")}.`,
    };
  }

  return undefined;
}

function dependencyNames(dependencies: Record<string, unknown> | undefined): string[] {
  return dependencies ? Object.keys(dependencies) : [];
}

function declaredDependencyNames(
  packageJson: PackageJson,
  config: c420uiNpmDependencyConfig,
): Set<string> {
  return new Set([
    ...dependencyNames(packageJson.dependencies),
    ...dependencyNames(packageJson.optionalDependencies),
    ...(config.includeDev === false ? [] : dependencyNames(packageJson.devDependencies)),
  ]);
}

export function resolveC420UINpmDependency(dependency: string, rootDir: string): boolean {
  let currentDir = path.resolve(rootDir);
  while (true) {
    const candidate = path.join(currentDir, "node_modules", dependency, "package.json");
    if (fs.existsSync(candidate)) return true;
    const parent = path.dirname(currentDir);
    if (parent === currentDir) return false;
    currentDir = parent;
  }
}

function requiredNpmDependencies(config: c420uiNpmDependencyConfig): string[] {
  return [
    ...(config.requiredDependencies ?? []),
    ...(config.includeDev === false ? [] : (config.requiredDevDependencies ?? [])),
  ];
}

function installArgs(config: c420uiNpmDependencyConfig, rootDir: string): string[] {
  const strategy = config.installStrategy ?? "auto";
  const lockfile = config.lockfile ?? "package-lock.json";
  const hasLockfile = fs.existsSync(path.join(rootDir, lockfile));
  const command = strategy === "ci" || (strategy === "auto" && hasLockfile) ? "ci" : "install";
  return config.includeDev === false ? [command] : [command, "--include=dev"];
}

export function planC420UINpmInstallCommand(
  config: c420uiNpmDependencyConfig | undefined,
  rootDir: string,
): c420uiPlannedHostDependencyCommand | undefined {
  if (!config) return undefined;
  return {
    command: "npm",
    args: installArgs(config, rootDir),
    cwd: rootDir,
  };
}

export function checkC420UINpmDeclaredDependencies(
  config: c420uiNpmDependencyConfig | undefined,
  packageJson: PackageJson,
): c420uiHostDependencyCheckResult {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }

  const declared = declaredDependencyNames(packageJson, config);
  const undeclared = requiredNpmDependencies(config).filter((dependency) => !declared.has(dependency));
  if (undeclared.length > 0) {
    return {
      status: "failed",
      dependencies: undeclared.map<c420uiHostDependency>((dependency) => ({
        id: dependency,
        label: dependency,
      })),
      exitCode: 1,
      message: `Required npm dependencies are not declared in package.json: ${undeclared.join(", ")}.`,
    };
  }

  return { status: "available", message: "Required npm dependencies are declared." };
}

export function checkC420UINpmInstalledDependencies(
  config: c420uiNpmDependencyConfig | undefined,
  options: {
    rootDir: string;
    resolveDependency?: (dependency: string, rootDir: string) => boolean;
  },
): c420uiHostDependencyCheckResult {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }

  const resolveDependency = options.resolveDependency ?? resolveC420UINpmDependency;
  const missing = requiredNpmDependencies(config)
    .filter((dependency) => !resolveDependency(dependency, options.rootDir))
    .map<c420uiHostDependency>((dependency) => ({
      id: dependency,
      label: dependency,
    }));

  if (missing.length > 0) {
    return {
      status: "missing",
      dependencies: missing,
      exitCode: 1,
      message: `Required npm dependencies are declared but not installed: ${missing.map((item) => item.id).join(", ")}.`,
    };
  }

  return { status: "available", message: "Required npm dependencies are installed." };
}

export function checkC420UINpmDependencies(
  config: c420uiNpmDependencyConfig | undefined,
  options: {
    rootDir: string;
    env?: NodeJS.ProcessEnv;
    resolveDependency?: (dependency: string, rootDir: string) => boolean;
  },
): c420uiHostDependencyCheckResult {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }

  if (config.packageManager !== "npm") {
    return { status: "failed", exitCode: 1, message: `Unsupported package manager: ${config.packageManager}.` };
  }

  const { packageJson, result } = readPackageJson(options.rootDir);
  if (result) return result;
  const scriptsResult = validatePackageScripts(packageJson ?? {});
  if (scriptsResult) return scriptsResult;

  const declaredResult = checkC420UINpmDeclaredDependencies(config, packageJson ?? {});
  if (declaredResult.status === "failed") return declaredResult;

  return checkC420UINpmInstalledDependencies(config, {
    rootDir: options.rootDir,
    resolveDependency: options.resolveDependency,
  });
}

const defaultNpmCommandRunner: c420uiNpmCommandRunner = async (options) => {
  const result = await runC420UIRustProcess({
    rootDir: options.rootDir,
    command: options.command,
    args: options.args,
    cwd: options.cwd,
    env: options.env,
    label: options.label,
    emitLog: options.emitLog ?? (() => {}),
    emitProgress: options.emitProgress ?? (() => {}),
  });

  if (result.status === "success") {
    return { status: "available", message: `${options.label} completed successfully.` };
  }

  return {
    status: "failed",
    exitCode: result.code,
    message: result.message ?? `${options.label} failed.`,
  };
};

export async function ensureC420UINpmDependencies(
  config: c420uiNpmDependencyConfig | undefined,
  options: {
    rootDir: string;
    env?: NodeJS.ProcessEnv;
    runCommand?: c420uiNpmCommandRunner;
    emitLog?: (event: c420uiLogEvent) => void;
    emitProgress?: (event: c420uiProgressEvent) => void;
  },
): Promise<c420uiHostDependencyCheckResult> {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }

  const env = options.env ?? process.env;
  if (env.C420UI_SKIP_DEPENDENCY_INSTALL === "1") {
    return {
      status: "failed",
      exitCode: 1,
      message: "npm dependency installation was skipped because C420UI_SKIP_DEPENDENCY_INSTALL=1.",
    };
  }

  const { packageJson, result } = readPackageJson(options.rootDir);
  if (result) return result;
  const scriptsResult = validatePackageScripts(packageJson ?? {});
  if (scriptsResult) return scriptsResult;
  const declaredResult = checkC420UINpmDeclaredDependencies(config, packageJson ?? {});
  if (declaredResult.status === "failed") return declaredResult;

  const args = installArgs(config, options.rootDir);
  const runCommand = options.runCommand ?? defaultNpmCommandRunner;
  const repairMessage = env.C420UI_DEPENDENCY_REPAIR === "clean" ? " after clean repair was requested" : "";
  const commandResult = await runCommand({
    rootDir: options.rootDir,
    command: "npm",
    args,
    cwd: options.rootDir,
    env,
    label: `npm ${args.join(" ")}`,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress,
  });

  if (commandResult.status === "failed") {
    return {
      status: "failed",
      exitCode: commandResult.exitCode ?? 1,
      message: `npm ${args.join(" ")} failed${repairMessage}.`,
    };
  }

  return { status: "available", message: `npm ${args.join(" ")} completed successfully${repairMessage}.` };
}

export function getC420UINpmInstallArgsForTest(config: c420uiNpmDependencyConfig, rootDir: string): string[] {
  return installArgs(config, rootDir);
}
