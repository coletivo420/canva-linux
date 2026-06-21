import { parseDryRun } from "../../host/dry-run.js";
import { runDetectedUninstall } from "../uninstall/detected.js";
import { runResetUserData } from "./reset-user-data.js";
import { ok } from "../../host/ui.js";

export async function runPurge(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  await runDetectedUninstall(dryRun ? ["--dry-run"] : []);
  await runResetUserData(dryRun ? ["--dry-run"] : []);
  ok("User data removed for Flatpak and Native paths");
}
