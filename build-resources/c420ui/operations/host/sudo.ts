import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { projectRoot } from "../../host/paths";

const SUDO_HELPER_PATH = "build-resources/c420ui/host/linux/sudo-helper.sh";

export function c420uiSudoValidate(rootDir: string = projectRoot()): boolean {
  const result = spawnSync("bash", [SUDO_HELPER_PATH, "--validate"], {
    cwd: rootDir,
    stdio: "inherit",
  });
  return result.status === 0;
}

export function c420uiSudoRun(
  command: string,
  args: string[],
  options: SpawnSyncOptions & { dryRun?: boolean } = {},
): number {
  const rootDir = options.cwd?.toString() || projectRoot();
  const dryRun = options.dryRun ?? false;

  if (dryRun) {
    console.log(`[dry-run] sudo ${command} ${args.join(" ")}`);
    return 0;
  }

  const commandLine = [command, ...args]
    .map((value) => `'${value.replaceAll("'", "'\"'\"'")}'`)
    .join(" ");

  const result = spawnSync(
    "bash",
    ["-lc", `source '${SUDO_HELPER_PATH}' && c420ui_sudo ${commandLine}`],
    {
      ...options,
      cwd: rootDir,
      stdio: options.stdio ?? "inherit",
    },
  );

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
