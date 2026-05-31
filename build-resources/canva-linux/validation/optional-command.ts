import { spawnSync } from "node:child_process";

export function hasCommand(command: string): boolean {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}
