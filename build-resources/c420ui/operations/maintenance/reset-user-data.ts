import { parseDryRun } from "../../host/dry-run.js";
import { runNativeUninstall } from "../uninstall/native.js";

export function runResetUserData(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  runNativeUninstall(["--all", "--purge-data", ...(dryRun ? ["--dry-run"] : [])]);
}
