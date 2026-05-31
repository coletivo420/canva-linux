import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { runCommand } from "../host/command-runner";

export function runDetectedUninstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("bash", ["scripts/uninstall-detected.sh"], { cwd: rootDir, dryRun, env: process.env });
}
