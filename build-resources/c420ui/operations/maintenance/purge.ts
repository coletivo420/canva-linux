import { parseDryRun } from "../../host/dry-run.js";
import { runDetectedUninstall } from "../uninstall/detected.js";
import { runResetUserData } from "./reset-user-data.js";
import { ok } from "../../host/ui.js";

export function runPurge(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  runDetectedUninstall(dryRun ? ["--dry-run"] : []);
  runResetUserData(dryRun ? ["--dry-run"] : []);
  ok("User data removed for Flatpak and Native paths");
}
