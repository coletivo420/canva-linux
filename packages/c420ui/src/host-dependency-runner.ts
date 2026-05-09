import { checkC420UICommandDependencies } from "./command-dependencies";
import { checkC420UINodeDependency } from "./node-dependencies";
import {
  checkC420UINpmDependencies,
  ensureC420UINpmDependencies,
  type c420uiNpmCommandRunner,
} from "./npm-dependencies";
import type {
  c420uiHostDependencyCheckResult,
  c420uiHostDependencyConfig,
  c420uiHostDependencyEnsureOptions,
} from "./host-dependencies";

function firstFailure(results: c420uiHostDependencyCheckResult[]): c420uiHostDependencyCheckResult | undefined {
  return results.find((result) => result.status === "failed" || result.status === "missing");
}

export function runC420UIHostDependencyCheck(
  config: c420uiHostDependencyConfig,
  options: c420uiHostDependencyEnsureOptions,
): c420uiHostDependencyCheckResult {
  const nodeResult = checkC420UINodeDependency(config.node);
  if (nodeResult.status === "failed" || nodeResult.status === "missing") return nodeResult;

  const commandResult = checkC420UICommandDependencies(config.commands ?? [], {
    env: options.env,
  });
  if (commandResult.status === "failed" || commandResult.status === "missing") return commandResult;

  const npmResult = checkC420UINpmDependencies(config.npm, {
    rootDir: options.rootDir,
    env: options.env,
  });
  const failure = firstFailure([npmResult]);
  if (failure) return failure;

  return { status: "available", message: "Host dependencies are available." };
}

export function runC420UIHostDependencyEnsure(
  config: c420uiHostDependencyConfig,
  options: c420uiHostDependencyEnsureOptions & {
    runCommand?: c420uiNpmCommandRunner;
  },
): c420uiHostDependencyCheckResult {
  const nodeResult = checkC420UINodeDependency(config.node);
  if (nodeResult.status === "failed" || nodeResult.status === "missing") return nodeResult;

  const commandResult = checkC420UICommandDependencies(config.commands ?? [], {
    env: options.env,
  });
  if (commandResult.status === "failed" || commandResult.status === "missing") return commandResult;

  const npmResult = checkC420UINpmDependencies(config.npm, {
    rootDir: options.rootDir,
    env: options.env,
  });
  const repairRequested = options.env?.C420UI_DEPENDENCY_REPAIR === "clean";
  if (npmResult.status === "available" && !repairRequested) {
    return { status: "available", message: "Host dependencies are available." };
  }
  if (npmResult.status === "failed") return npmResult;
  if (npmResult.status === "missing" || repairRequested) {
    if (options.dryRun) {
      return { status: "skipped", message: "Host dependency installation would run, but dry-run is enabled." };
    }
    return ensureC420UINpmDependencies(config.npm, {
      rootDir: options.rootDir,
      env: options.env,
      runCommand: options.runCommand,
    });
  }

  return { status: "available", message: "Host dependencies are available." };
}
