import { loadCanvaLinuxMaintenanceConfig } from "../../../canva-linux/c420ui-adapter/maintenance.js";
import { parseDryRun } from "../../host/dry-run.js";
import { ok } from "../../host/ui.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustFixPermissions } from "../../src/rust-maintenance.js";

export async function runFixBuildPermissions(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  const realUser = process.env.SUDO_USER || process.env.USER;
  if (!realUser) throw new Error("Unable to resolve target user for ownership restoration");
  const maintenance = loadCanvaLinuxMaintenanceConfig(rootDir);
  const targets = maintenance.permissionTargets ?? [];

  const result = await runC420UIRustFixPermissions({
    rootDir,
    targets,
    user: realUser,
    dryRun,
    env: process.env,
  });

  for (const item of result.updated ?? []) {
    if (item.status === "updated" || item.status === "planned") {
      ok(`Restored ownership: ${item.target}`);
    }
  }

  ok("Permission fix completed.");
}
