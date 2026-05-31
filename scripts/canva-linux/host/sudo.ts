import { runCommand, type RunOptions } from "./command-runner";

export function runWithOptionalSudo(requireRoot: boolean, command: string, args: string[], options: RunOptions): number {
  if (!requireRoot) return runCommand(command, args, options);
  return runCommand("sudo", [command, ...args], options);
}
