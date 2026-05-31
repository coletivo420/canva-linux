import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { runCommand } from "../host/command-runner";

export function runNativeUninstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const mode = argv.includes("--all") ? "all" : "scope";
  const uninstallArgs = ["scripts/uninstall-native.sh", mode];
  if (argv.includes("--purge-data")) {
    uninstallArgs.push("--purge-data");
  }

  runCommand("bash", uninstallArgs, {
    cwd: rootDir,
    dryRun,
    env: process.env,
  });
}
