import type { c420uiMaintenanceConfig } from "../../src/maintenance-config.js";
import { info, ok } from "../../host/ui.js";
import { runC420UIRustRemovePaths } from "../../src/rust-maintenance.js";

export async function runC420UICleanArtifacts(options: {
  rootDir: string;
  maintenance: c420uiMaintenanceConfig;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const { rootDir, maintenance, dryRun, env } = options;
  const targets = maintenance.cleanupTargets ?? [];
  const result = await runC420UIRustRemovePaths({
    rootDir,
    targets,
    dryRun,
    allowSudo: true,
    env,
  });

  for (const item of result.removed ?? []) {
    if (item.status === "planned") {
      info(`[dry-run] rm -rf ${item.target}`);
    } else if (item.status === "removed") {
      ok(`Removed ${item.target}`);
    } else if (item.status === "missing") {
      info(`Already clean: ${item.target}`);
    }
  }
}
