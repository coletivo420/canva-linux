import { spawnSync } from "node:child_process";

export type StepResult = {
  ok: boolean;
  command: string;
  status: number;
};

function summarizeError(result: ReturnType<typeof spawnSync>): string {
  if (result.error) return result.error.message;
  return `exit ${result.status ?? 1}`;
}

export function runStep(label: string, command: string, args: string[], cwd: string): StepResult {
  console.log(`[info] ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[error] ${label} (${summarizeError(result)})`);
    return { ok: false, command: `${command} ${args.join(" ")}`, status: result.status ?? 1 };
  }

  console.log(`[ok]  ${label}`);
  return { ok: true, command: `${command} ${args.join(" ")}`, status: 0 };
}
