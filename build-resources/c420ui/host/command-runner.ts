import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { info } from "./ui.js";

export type RunOptions = {
  cwd: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  allowFailure?: boolean;
  timeout?: number;
  stdio?: SpawnSyncOptions["stdio"];
};

export function runCommand(command: string, args: string[], options: RunOptions): number {
  const rendered = `${command} ${args.join(" ")}`.trim();
  if (options.dryRun) {
    info(`[dry-run] ${rendered}`);
    return 0;
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: options.stdio ?? "inherit",
    shell: false,
    env: options.env ?? process.env,
    timeout: options.timeout,
  });

  if (result.error) {
    if (!options.allowFailure) {
      throw new Error(`Command failed to start: ${result.error.message} (${rendered})`);
    }
    return 1;
  }

  const status = result.status ?? 1;
  if (status !== 0 && !options.allowFailure) {
    throw new Error(`Command failed (${status}): ${rendered}`);
  }
  return status;
}
