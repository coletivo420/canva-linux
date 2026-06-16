import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { info } from "../../host/ui.js";

export async function runBuildElectronDir(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);

  if (dryRun) {
    info("[dry-run] npm run dist");
    return;
  }

  await runC420UIRustProcess({
    rootDir,
    command: "npm",
    args: ["run", "dist"],
    cwd: rootDir,
    env: process.env,
    label: "dist",
    emitLog: () => {},
    emitProgress: () => {},
  });
}
