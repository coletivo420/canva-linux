import fs from "node:fs";
import path from "node:path";
import type {
  c420uiCommandDependency,
  c420uiHostDependency,
  c420uiHostDependencyCheckResult,
} from "./host-dependencies";

export type c420uiCommandLookup = (
  command: string,
  options: { env?: NodeJS.ProcessEnv },
) => boolean;

function candidateNames(command: string, env?: NodeJS.ProcessEnv): string[] {
  if (process.platform !== "win32") return [command];
  const extensions = (env?.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean);
  return path.extname(command)
    ? [command]
    : [command, ...extensions.map((extension) => `${command}${extension}`)];
}

export const lookupC420UICommandInPath: c420uiCommandLookup = (
  command,
  options,
): boolean => {
  if (!command) return false;
  const env = options.env ?? process.env;
  const pathValue = env.PATH || "";
  const pathSeparator = process.platform === "win32" ? ";" : ":";
  const commandHasDirectory = command.includes("/") || command.includes("\\");
  const directories = commandHasDirectory ? [""] : pathValue.split(pathSeparator);

  for (const directory of directories) {
    for (const candidate of candidateNames(command, env)) {
      const fullPath = commandHasDirectory ? candidate : path.join(directory, candidate);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) return true;
      } catch {
        // Continue searching PATH.
      }
    }
  }

  return false;
};

export function checkC420UICommandDependencies(
  dependencies: c420uiCommandDependency[] = [],
  options: {
    env?: NodeJS.ProcessEnv;
    lookupCommand?: c420uiCommandLookup;
  } = {},
): c420uiHostDependencyCheckResult {
  if (dependencies.length === 0) {
    return { status: "skipped", message: "No command dependencies were declared." };
  }

  const lookupCommand = options.lookupCommand ?? lookupC420UICommandInPath;
  const missing: c420uiHostDependency[] = [];

  for (const dependency of dependencies) {
    if (lookupCommand(dependency.command, { env: options.env })) continue;
    if (dependency.required === false) continue;
    missing.push({
      id: dependency.id,
      label: dependency.installHint
        ? `${dependency.command} (${dependency.installHint})`
        : dependency.command,
      command: dependency.command,
      requiredFor: dependency.requiredFor,
    });
  }

  if (missing.length > 0) {
    return {
      status: "missing",
      dependencies: missing,
      exitCode: 1,
      message: `Missing required command dependencies: ${missing.map((item) => item.command ?? item.id).join(", ")}.`,
    };
  }

  return { status: "available", message: "Required command dependencies are available." };
}
