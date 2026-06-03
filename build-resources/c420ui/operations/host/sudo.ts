import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { projectRoot } from "../../host/paths.js";

const sudoTimeoutSeconds = Number.parseInt(
  process.env.C420UI_SUDO_TIMEOUT_SECONDS ?? "30",
  10,
);

function sudoTimeoutMilliseconds(): number {
  if (!Number.isFinite(sudoTimeoutSeconds) || sudoTimeoutSeconds <= 0) {
    return 30_000;
  }
  return sudoTimeoutSeconds * 1000;
}

function isNonInteractiveRootMode(): boolean {
  return process.env.C420UI_ROOT_AUTH === "1";
}

function assertNotUserScope(): boolean {
  if (process.env.C420UI_ACTION_SCOPE !== "user") return true;
  console.error("[error] Refusing to run sudo while a user-scope action is active.");
  console.error("[error] Check C420UI_ACTION_SCOPE and use non-privileged helpers for user scope.");
  return false;
}

function reportSudoError(status: number | null): void {
  if (status === null) {
    console.error("[error] sudo authorization failed or was canceled.");
    return;
  }
  if (isNonInteractiveRootMode()) {
    console.error("[error] sudo credentials are not cached for non-interactive root mode.");
    console.error("[error] Re-run the action and complete administrator authentication before privileged writes.");
    return;
  }
  console.error("[error] sudo authorization failed or was canceled.");
}

function reportSudoSpawnError(error: Error): void {
  const errorCode = "code" in error ? error.code : undefined;
  if (errorCode === "ETIMEDOUT") {
    console.error(`[error] sudo authorization timed out after ${sudoTimeoutSeconds}s.`);
    return;
  }
  console.error(`[error] sudo validation failed: ${error.message}`);
}

export function c420uiSudoValidate(rootDir: string = projectRoot()): boolean {
  if (!assertNotUserScope()) return false;
  const result = spawnSync("sudo", isNonInteractiveRootMode() ? ["-n", "-v"] : ["-v"], {
    cwd: rootDir,
    stdio: "inherit",
    timeout: sudoTimeoutMilliseconds(),
  });
  if (result.error) {
    reportSudoSpawnError(result.error);
    return false;
  }
  if (result.status === 0) return true;
  reportSudoError(result.status);
  return false;
}

export function c420uiSudoRun(
  command: string,
  args: string[],
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  const rootDir = options.cwd?.toString() || projectRoot();
  const dryRun = options.dryRun ?? false;
  const sudoArgs = isNonInteractiveRootMode() ? ["-n", command, ...args] : [command, ...args];

  if (dryRun) {
    console.log(`[dry-run] sudo ${sudoArgs.join(" ")}`);
    return 0;
  }
  if (!c420uiSudoValidate(rootDir)) return 1;

  const result = spawnSync("sudo", sudoArgs, {
    ...options,
    cwd: rootDir,
    stdio: options.stdio ?? "inherit",
    timeout: options.timeout,
  });

  if (result.error) {
    reportSudoSpawnError(result.error);
    return 1;
  }
  return result.status ?? 1;
}

export function c420uiSudoInstall(
  args: string[],
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  return c420uiSudoRun("install", args, options);
}

export function c420uiSudoMkdir(
  dir: string,
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  return c420uiSudoRun("mkdir", ["-p", dir], options);
}

export function c420uiSudoRm(
  path: string,
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  return c420uiSudoRun("rm", ["-rf", path], options);
}

export function c420uiSudoCp(
  src: string,
  dst: string,
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  return c420uiSudoRun("cp", ["-a", src, dst], options);
}

export function c420uiSudoChmod(
  modeOrArgs: string | string[],
  path?: string,
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  const args = Array.isArray(modeOrArgs) ? modeOrArgs : [modeOrArgs, path ?? ""];
  return c420uiSudoRun("chmod", args, options);
}

export function c420uiSudoLn(
  src: string,
  dst: string,
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  return c420uiSudoRun("ln", ["-sfn", src, dst], options);
}
