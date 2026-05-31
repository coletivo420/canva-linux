import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { runCommand } from "../../host/command-runner";

export function runResetUserData(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("bash", ["scripts/reset-user-data.sh"], { cwd: rootDir, dryRun, env: process.env });
}
