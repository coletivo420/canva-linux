import { loadCanvaLinuxMaintenanceConfig } from "./maintenance.js";
import { runC420UICleanArtifacts } from "../../c420ui/operations/maintenance/clean-artifacts.js";
import { runC420UIFixBuildPermissions } from "../../c420ui/operations/maintenance/fix-build-permissions.js";
import { projectRoot } from "../../c420ui/host/paths.js";
import { parseDryRun } from "../../c420ui/host/dry-run.js";

export async function runCanvaLinuxCleanArtifacts(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  const maintenance = loadCanvaLinuxMaintenanceConfig(rootDir);
  await runC420UICleanArtifacts({
    rootDir,
    maintenance,
    dryRun,
    env: process.env,
  });
}

export async function runCanvaLinuxFixBuildPermissions(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  const user = process.env.SUDO_USER || process.env.USER;
  if (!user) throw new Error("Unable to resolve target user for ownership restoration");
  const maintenance = loadCanvaLinuxMaintenanceConfig(rootDir);
  await runC420UIFixBuildPermissions({
    rootDir,
    maintenance,
    user,
    dryRun,
    env: process.env,
  });
}
