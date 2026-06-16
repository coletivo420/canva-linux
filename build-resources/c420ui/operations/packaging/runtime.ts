import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { info } from "../../host/ui.js";

export async function runBuildRuntime(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);

  if (dryRun) {
    info("[dry-run] npm run build:runtime");
    return;
  }

  await runC420UIRustProcess({
    rootDir,
    command: "npm",
    args: ["run", "build:runtime"],
    cwd: rootDir,
    env: process.env,
    label: "build:runtime",
    emitLog: () => {},
    emitProgress: () => {},
  });
}
