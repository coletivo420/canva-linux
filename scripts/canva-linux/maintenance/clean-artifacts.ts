import fs from "node:fs";
import { parseDryRun } from "../host/dry-run";
import { ensurePathIsSafe, projectRoot } from "../host/paths";
import { info, ok } from "../host/ui";

export function runCleanArtifacts(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  for (const rel of [".build", "dist", "build-dir", "repo", ".flatpak-builder"] as const) {
    ensurePathIsSafe(rootDir, rel);
    if (!fs.existsSync(`${rootDir}/${rel}`)) continue;
    if (dryRun) {
      info(`[dry-run] rm -rf ${rel}`);
      continue;
    }
    fs.rmSync(`${rootDir}/${rel}`, { recursive: true, force: true });
    ok(`Removed ${rel}`);
  }
}
