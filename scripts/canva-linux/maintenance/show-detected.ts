import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { runCommand } from "../host/command-runner";

export function runShowDetected(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("bash", ["scripts/show-detected-installations.sh"], { cwd: rootDir, dryRun, env: process.env });
}
