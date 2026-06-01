import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { detectInstallations, printDetectionStatusEnv } from "../detection/install-detection";

export function runShowDetected(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  if (dryRun) {
    console.log("[dry-run] detect installations and print summary");
    return;
  }
  printDetectionStatusEnv(detectInstallations(rootDir));
}
