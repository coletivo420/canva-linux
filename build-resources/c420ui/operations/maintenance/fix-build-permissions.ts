import type { c420uiMaintenanceConfig } from "../../src/maintenance-config.js";
import { info, ok } from "../../host/ui.js";
import { runC420UIRustFixPermissions } from "../../src/rust-maintenance.js";

export async function runC420UIFixBuildPermissions(options: {
  rootDir: string;
  maintenance: c420uiMaintenanceConfig;
  user: string;
  group?: string | null;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const { rootDir, maintenance, user, group, dryRun, env } = options;
  const targets = maintenance.permissionTargets ?? [];

  const result = await runC420UIRustFixPermissions({
    rootDir,
    targets,
    user,
    group,
    dryRun,
    env,
  });

  for (const item of result.updated ?? []) {
    if (item.status === "planned") {
      info(`[dry-run] chown -R ${user} ${item.target}`);
    } else if (item.status === "updated") {
      ok(`Restored ownership: ${item.target}`);
    } else if (item.status === "missing") {
      info(`Skipping missing target: ${item.target}`);
    }
  }

  ok("Permission fix completed.");
}
