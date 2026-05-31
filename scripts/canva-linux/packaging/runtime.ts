import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { runCommand } from "../host/command-runner";

export function runBuildRuntime(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("npm", ["run", "build:runtime"], { cwd: rootDir, dryRun, env: process.env });
}
