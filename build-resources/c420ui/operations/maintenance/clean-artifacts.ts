import { loadCanvaLinuxMaintenanceConfig } from "../../../canva-linux/c420ui-adapter/maintenance.js";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { info, ok } from "../../host/ui.js";
import { runC420UIRustRemovePaths } from "../../src/rust-maintenance.js";

export async function runCleanArtifacts(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  const maintenance = loadCanvaLinuxMaintenanceConfig(rootDir);
  const targets = maintenance.cleanupTargets ?? [];
  const result = await runC420UIRustRemovePaths({
    rootDir,
    targets,
    dryRun,
    allowSudo: true,
    env: process.env,
  });

  for (const item of result.removed ?? []) {
    if (item.status === "planned") {
      info(`[dry-run] rm -rf ${item.target}`);
    } else if (item.status === "removed") {
      ok(`Removed ${item.target}`);
    }
  }
}
