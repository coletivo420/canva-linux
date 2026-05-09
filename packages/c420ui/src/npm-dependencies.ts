import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type {
  c420uiHostDependency,
  c420uiHostDependencyCheckResult,
  c420uiNpmDependencyConfig,
} from "./host-dependencies";

export type c420uiNpmCommandRunner = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio?: "inherit" | "pipe";
  },
) => { status: number | null; error?: Error };

type PackageJson = {
  scripts?: Record<string, unknown>;
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

export function resolveC420UINpmDependency(dependency: string, rootDir: string): boolean {
  try {
    const projectRequire = createRequire(path.join(rootDir, "package.json"));
    projectRequire.resolve(dependency, { paths: [rootDir] });
    return true;
  } catch {
    return false;
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
      message: `Missing required npm dependencies: ${missing.map((item) => item.id).join(", ")}.`,
    };
  }

  return { status: "available", message: "Required npm dependencies are available." };
}

const defaultNpmCommandRunner: c420uiNpmCommandRunner = (command, args, options) =>
  spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    shell: false,
  });

export function ensureC420UINpmDependencies(
  config: c420uiNpmDependencyConfig | undefined,
  options: {
    rootDir: string;
    env?: NodeJS.ProcessEnv;
    runCommand?: c420uiNpmCommandRunner;
  },
): c420uiHostDependencyCheckResult {
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

  const args = installArgs(config, options.rootDir);
  const runCommand = options.runCommand ?? defaultNpmCommandRunner;
  const repairMessage = env.C420UI_DEPENDENCY_REPAIR === "clean" ? " after clean repair was requested" : "";
  const commandResult = runCommand("npm", args, {
    cwd: options.rootDir,
    env,
    stdio: "inherit",
  });

  if (commandResult.error) {
    return { status: "failed", exitCode: 1, message: commandResult.error.message };
  }

  const status = commandResult.status ?? 1;
  if (status !== 0) {
    return {
      status: "failed",
      exitCode: status,
      message: `npm ${args.join(" ")} failed${repairMessage}.`,
    };
  }

  return { status: "available", message: `npm ${args.join(" ")} completed successfully${repairMessage}.` };
}

export function getC420UINpmInstallArgsForTest(config: c420uiNpmDependencyConfig, rootDir: string): string[] {
  return installArgs(config, rootDir);
}
