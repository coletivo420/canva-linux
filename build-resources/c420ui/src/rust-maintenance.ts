import { runC420UIRustHost } from "./rust-host.js";

export type c420uiMaintenanceTargetStatus = {
  target: string;
  status: "removed" | "updated" | "missing" | "planned";
};

export type c420uiMaintenanceResult = {
  ok: boolean;
  command: "remove-paths" | "fix-permissions";
  version: string;
  removed?: c420uiMaintenanceTargetStatus[];
  updated?: c420uiMaintenanceTargetStatus[];
};

export async function runC420UIRustRemovePaths(options: {
  rootDir: string;
  targets: string[];
  dryRun?: boolean;
  allowSudo?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<c420uiMaintenanceResult> {
  return runC420UIRustHost<c420uiMaintenanceResult>({
    rootDir: options.rootDir,
    command: "remove-paths",
    input: {
      rootDir: options.rootDir,
      targets: options.targets,
      dryRun: options.dryRun ?? false,
      allowSudo: options.allowSudo ?? false,
    },
    env: options.env,
  });
}

export async function runC420UIRustFixPermissions(options: {
  rootDir: string;
  targets: string[];
  user: string;
  group?: string | null;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<c420uiMaintenanceResult> {
  return runC420UIRustHost<c420uiMaintenanceResult>({
    rootDir: options.rootDir,
    command: "fix-permissions",
    input: {
      rootDir: options.rootDir,
      targets: options.targets,
      user: options.user,
      group: options.group ?? null,
      dryRun: options.dryRun ?? false,
    },
    env: options.env,
  });
}

export async function runC420UIRustSudoValidate(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<boolean> {
  const result = await runC420UIRustHost<{ ok: boolean; available: boolean }>({
    rootDir: options.rootDir,
    command: "sudo-validate",
    input: {
      rootDir: options.rootDir,
      nonInteractive: options.env?.C420UI_ROOT_AUTH === "1",
      timeoutSeconds: Number.parseInt(options.env?.C420UI_SUDO_TIMEOUT_SECONDS ?? "30", 10),
      refuseUserScope: true,
      actionScope: options.env?.C420UI_ACTION_SCOPE,
    },
    env: options.env,
  });
  return result.ok && result.available;
}
