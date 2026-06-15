import { projectRoot } from "./paths.js";
import { runCommand, type RunOptions } from "./command-runner.js";
import * as ui from "./ui.js";

type SudoRunOptions = Omit<RunOptions, "cwd"> & {
  cwd?: string;
};

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
  ui.error("Refusing to run sudo while a user-scope action is active.");
  ui.error("Check C420UI_ACTION_SCOPE and use non-privileged helpers for user scope.");
  return false;
}

function reportSudoError(status: number | null): void {
  if (status === null) {
    ui.error("sudo authorization failed or was canceled.");
    return;
  }
  if (isNonInteractiveRootMode()) {
    ui.error("sudo credentials are not cached for non-interactive root mode.");
    ui.error("Re-run the action and complete administrator authentication before privileged writes.");
    return;
  }
  ui.error("sudo authorization failed or was canceled.");
}

function reportSudoSpawnError(error: Error): void {
  const errorCode = "code" in (error as any) ? (error as any).code : undefined;
  if (errorCode === "ETIMEDOUT") {
    ui.error(`sudo authorization timed out after ${sudoTimeoutSeconds}s.`);
    return;
  }
  ui.error(`sudo validation failed: ${error.message}`);
}

export function c420uiSudoValidate(rootDir: string = projectRoot()): boolean {
  if (!assertNotUserScope()) return false;
  try {
    const status = runCommand("sudo", isNonInteractiveRootMode() ? ["-n", "-v"] : ["-v"], {
      cwd: rootDir,
      stdio: "inherit",
      timeout: sudoTimeoutMilliseconds(),
      allowFailure: true,
    });
    if (status === 0) return true;
    reportSudoError(status);
    return false;
  } catch (error) {
    reportSudoSpawnError(error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export function c420uiSudoRun(
  command: string,
  args: string[],
  options: SudoRunOptions = {},
): number {
  const rootDir = options.cwd?.toString() || projectRoot();
  const dryRun = options.dryRun ?? false;
  const sudoArgs = isNonInteractiveRootMode() ? ["-n", command, ...args] : [command, ...args];

  if (dryRun) {
    ui.info(`[dry-run] sudo ${sudoArgs.join(" ")}`);
    return 0;
  }
  if (!c420uiSudoValidate(rootDir)) return 1;

  try {
    return runCommand("sudo", sudoArgs, {
      ...options,
      cwd: rootDir,
      allowFailure: true,
    } as RunOptions);
  } catch (err: any) {
    reportSudoSpawnError(err);
    return 1;
  }
}

export function c420uiSudoInstall(
  args: string[],
  options: SudoRunOptions = {},
): number {
  return c420uiSudoRun("install", args, options);
}

export function c420uiSudoMkdir(
  dir: string,
  options: SudoRunOptions = {},
): number {
  return c420uiSudoRun("mkdir", ["-p", dir], options);
}

export function c420uiSudoRm(
  path: string,
  options: SudoRunOptions = {},
): number {
  return c420uiSudoRun("rm", ["-rf", path], options);
}

export function c420uiSudoCp(
  src: string,
  dst: string,
  options: SudoRunOptions = {},
): number {
  return c420uiSudoRun("cp", ["-a", src, dst], options);
}

export function c420uiSudoChmod(
  modeOrArgs: string | string[],
  path?: string,
  options: SudoRunOptions = {},
): number {
  const args = Array.isArray(modeOrArgs) ? modeOrArgs : [modeOrArgs, path ?? ""];
  return c420uiSudoRun("chmod", args, options);
}

export function c420uiSudoLn(
  src: string,
  dst: string,
  options: SudoRunOptions = {},
): number {
  return c420uiSudoRun("ln", ["-sfn", src, dst], options);
}

export function runWithOptionalSudo(requireRoot: boolean, command: string, args: string[], options: RunOptions): number {
  if (!requireRoot) return runCommand(command, args, options);
  return c420uiSudoRun(command, args, options);
}
