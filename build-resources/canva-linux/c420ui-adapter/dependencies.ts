import fs from "node:fs";
import path from "node:path";
import {
  runC420UIHostDependencyEnsure,
  validateC420UIHostDependencyConfig,
  type c420uiHostDependencyCheckResult,
  type c420uiHostDependencyConfig,
  type c420uiNpmCommandRunner,
} from "../../c420ui/src/index.js";

export function loadCanvaLinuxDependencyConfig(rootDir: string): c420uiHostDependencyConfig {
  const relativeConfigPath = "build-resources/canva-linux/config/host-dependencies.json";
  const configPath = path.join(rootDir, relativeConfigPath);
  return validateC420UIHostDependencyConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
}

export function ensureCanvaLinuxHostDependencies(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: c420uiNpmCommandRunner;
}): Promise<c420uiHostDependencyCheckResult> {
  return runC420UIHostDependencyEnsure(loadCanvaLinuxDependencyConfig(options.rootDir), options);
}
