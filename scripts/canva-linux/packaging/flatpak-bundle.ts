import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { requireCommands } from "../host/preflight";
import { runCommand } from "../host/command-runner";

export function runBuildFlatpakBundle(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  requireCommands(["flatpak", "flatpak-builder", "bash"]);
  runCommand("bash", ["build-resources/c420ui/scripts/build-flatpak-bundle.sh", ...argv], { cwd: rootDir, dryRun, env: process.env });
}
