import { resolveC420UIHostDependencies } from "./host-dependency-resolver.js";
import type { c420uiNpmCommandRunner } from "./npm-dependencies.js";
import type {
  c420uiHostDependencyCheckResult,
  c420uiHostDependencyConfig,
  c420uiHostDependencyEnsureOptions,
} from "./host-dependencies.js";

export async function runC420UIHostDependencyCheck(
  config: c420uiHostDependencyConfig,
  options: c420uiHostDependencyEnsureOptions,
): Promise<c420uiHostDependencyCheckResult> {
  return resolveC420UIHostDependencies(config, {
    ...options,
    action: "check",
  });
}

export async function runC420UIHostDependencyEnsure(
  config: c420uiHostDependencyConfig,
  options: c420uiHostDependencyEnsureOptions & {
    runCommand?: c420uiNpmCommandRunner;
  },
): Promise<c420uiHostDependencyCheckResult> {
  return resolveC420UIHostDependencies(config, {
    ...options,
    action: "ensure",
    runCommand: options.runCommand,
  });
}
