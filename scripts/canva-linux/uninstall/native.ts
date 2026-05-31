import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { runCommand } from "../host/command-runner";

export function runNativeUninstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const mode = argv.includes("--all") ? "all" : "scope";
  runCommand("bash", ["scripts/uninstall-native.sh", mode], {
    cwd: rootDir,
    dryRun,
    env: process.env,
  });
}
