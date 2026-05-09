import fs from "node:fs";
import path from "node:path";
import {
  runC420UIHostDependencyEnsure,
  type c420uiHostDependencyCheckResult,
  type c420uiHostDependencyConfig,
  type c420uiNpmCommandRunner,
} from "../../packages/c420ui/src";

export function loadCanvaLinuxDependencyConfig(rootDir: string): c420uiHostDependencyConfig {
  const relativeConfigPath = "config/canva-linux/dependencies.json";
  const configPath = path.join(rootDir, relativeConfigPath);
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as c420uiHostDependencyConfig;
}

export function ensureCanvaLinuxHostDependencies(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: c420uiNpmCommandRunner;
}): c420uiHostDependencyCheckResult {
  return runC420UIHostDependencyEnsure(loadCanvaLinuxDependencyConfig(options.rootDir), options);
}
