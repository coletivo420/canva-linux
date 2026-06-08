import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { runCommand } from "../../host/command-runner.js";

export function runBuildRuntime(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  runCommand("npm", ["run", "build:runtime"], { cwd: rootDir, dryRun, env: process.env });
}
