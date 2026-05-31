import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { requireCommands } from "../../host/preflight";
import { runCommand } from "../../host/command-runner";

export function runBuildAppImage(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  requireCommands(["node", "npm", "bash"]);
  runCommand("bash", ["build-resources/c420ui/scripts/build-appimage.sh", ...argv], { cwd: rootDir, dryRun, env: process.env });
}
