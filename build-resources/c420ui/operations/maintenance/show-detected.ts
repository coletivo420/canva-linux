import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { detectInstallations, printDetectionStatusEnv } from "../detection/install-detection.js";

export function runShowDetected(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  if (dryRun) {
    console.log("[dry-run] detect installations and print summary");
    return;
  }
  printDetectionStatusEnv(detectInstallations(rootDir));
}
