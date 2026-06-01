import { parseDryRun } from "../../host/dry-run";
import { runNativeUninstall } from "../uninstall/native";

export function runResetUserData(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  runNativeUninstall(["--all", "--purge-data", ...(dryRun ? ["--dry-run"] : [])]);
}
