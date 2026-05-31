import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { runCommand } from "../../host/command-runner";

export function runFixBuildPermissions(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("bash", ["scripts/fix-build-permissions.sh"], { cwd: rootDir, dryRun, env: process.env });
}
