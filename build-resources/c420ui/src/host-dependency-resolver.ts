import {
  type c420uiHostDependencyCheckResult,
  type c420uiHostDependencyConfig,
  type c420uiHostDependencyEnsureOptions,
  type c420uiHostDependency,
  validateC420UIHostDependencyConfig,
} from "./host-dependencies.js";
import { runC420UIRustHost } from "./rust-host.js";
import {
  checkC420UINpmDependencies,
  ensureC420UINpmDependencies,
  planC420UINpmInstallCommand,
  type c420uiNpmCommandRunner,
} from "./npm-dependencies.js";

export async function resolveC420UIHostDependencies(
  config: c420uiHostDependencyConfig,
  options: c420uiHostDependencyEnsureOptions & {
    action?: "check" | "ensure";
    runCommand?: c420uiNpmCommandRunner;
  },
): Promise<c420uiHostDependencyCheckResult> {
  const validatedConfig = validateC420UIHostDependencyConfig(config);
  const action = options.action ?? "check";

  const rustInput = {
    node: validatedConfig.node
      ? {
          required: validatedConfig.node.required,
          minimumMajor: validatedConfig.node.minimumMajor,
          version: process.version,
        }
      : undefined,
    commands: validatedConfig.commands,
    env: {
      PATH: options.env?.PATH || process.env.PATH || "",
    },
  };

  let rustResult;
  try {
    rustResult = await runC420UIRustHost<{
      ok: boolean;
      command: string;
      version: string;
      status: "available" | "missing" | "failed";
      message: string;
      dependencies: c420uiHostDependency[];
    }>({
      rootDir: options.rootDir,
      command: "check-host-dependencies",
      input: rustInput,
      env: options.env,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      exitCode: 1,
      message: `c420ui Rust host check failed: ${msg}. Run "npm run build:c420ui-rs" to compile it.`,
    };
  }

  if (rustResult.status === "failed" || rustResult.status === "missing") {
    return {
      status: rustResult.status,
      message: rustResult.message,
      dependencies: rustResult.dependencies,
    };
  }

  // Rust checks OK, resolve NPM dependencies in TypeScript
  const npmResult = checkC420UINpmDependencies(validatedConfig.npm, {
    rootDir: options.rootDir,
    env: options.env,
  });

  if (action === "ensure") {
    const repairRequested = options.env?.C420UI_DEPENDENCY_REPAIR === "clean";
    if (npmResult.status === "available" && !repairRequested) {
      return { status: "available", message: "Host dependencies are available." };
    }
    if (npmResult.status === "failed") return npmResult;
    if (npmResult.status === "missing" || repairRequested) {
      if (options.dryRun) {
        return {
          status: "skipped",
          message: "Host dependency installation would run, but dry-run is enabled.",
          plannedCommand: planC420UINpmInstallCommand(validatedConfig.npm, options.rootDir),
        };
      }
      return await ensureC420UINpmDependencies(validatedConfig.npm, {
        rootDir: options.rootDir,
        env: options.env,
        runCommand: options.runCommand,
        emitLog: options.emitLog,
        emitProgress: options.emitProgress,
      });
    }
  } else {
    if (npmResult.status === "failed" || npmResult.status === "missing") {
      return npmResult;
    }
  }

  return { status: "available", message: "Host dependencies are available." };
}
