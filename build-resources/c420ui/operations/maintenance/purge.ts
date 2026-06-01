import { parseDryRun } from "../../host/dry-run";
import { runDetectedUninstall } from "../uninstall/detected";
import { runResetUserData } from "./reset-user-data";
import { ok } from "../../host/ui";

export function runPurge(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  runDetectedUninstall(dryRun ? ["--dry-run"] : []);
  runResetUserData(dryRun ? ["--dry-run"] : []);
  ok("User data removed for Flatpak and Native paths");
}
