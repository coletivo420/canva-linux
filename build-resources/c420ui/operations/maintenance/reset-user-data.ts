import { parseDryRun } from "../../host/dry-run.js";
import { runNativeUninstall } from "../uninstall/native.js";

export async function runResetUserData(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  await runNativeUninstall(["--all", "--purge-data", ...(dryRun ? ["--dry-run"] : [])]);
}
