import fs from "node:fs";
import { parseDryRun } from "../../host/dry-run.js";
import { ensurePathIsSafe, projectRoot } from "../../host/paths.js";
import { info, ok } from "../../host/ui.js";
import { runWithOptionalSudo } from "../../host/sudo.js";

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
    const absolutePath = `${rootDir}/${rel}`;
    try {
      fs.rmSync(absolutePath, { recursive: true, force: true });
      ok(`Removed ${rel}`);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
      if (code !== "EACCES" && code !== "EPERM") throw error;

      info(`Permission denied removing ${rel}; retrying with sudo.`);
      runWithOptionalSudo(true, "rm", ["-rf", absolutePath], {
        cwd: rootDir,
        dryRun,
        env: process.env,
      });
      ok(`Removed ${rel}`);
    }
  }
}
