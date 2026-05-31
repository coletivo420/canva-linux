import { spawnSync } from "node:child_process";

export function hasCommand(command: string): boolean {
  return (
    spawnSync(
      "bash",
      ["-lc", "command -v \"$1\" >/dev/null 2>&1", "--", command],
      { stdio: "ignore" },
    ).status ?? 1
  ) === 0;
}

export function requireCommands(commands: string[]): void {
  for (const command of commands) {
    if (!hasCommand(command)) {
      throw new Error(`Required command is missing: ${command}`);
    }
  }
}
