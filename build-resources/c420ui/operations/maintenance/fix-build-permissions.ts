import fs from "node:fs";
import { parseDryRun } from "../../host/dry-run.js";
import { c420uiSudoRun } from "../../host/sudo.js";
import { ok, warn } from "../../host/ui.js";
import { projectRoot } from "../../host/paths.js";

const ALLOWED = [".build", "dist", "build-dir", "repo", ".flatpak-builder"];

export function runFixBuildPermissions(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  const rootDir = projectRoot();
  const realUser = process.env.SUDO_USER || process.env.USER;
  if (!realUser) throw new Error("Unable to resolve target user for ownership restoration");


  for (const dir of ALLOWED) {
    const absolute = `${rootDir}/${dir}`;
    if (!fs.existsSync(absolute)) continue;
    if (fs.lstatSync(absolute).isSymbolicLink()) {
      warn(`Skipping symlink: ${dir}`);
      continue;
    }

    const status = c420uiSudoRun("chown", ["-R", `:`, absolute], { dryRun });
    if (status !== 0) throw new Error(`Failed to restore ownership: ${dir}`);
    ok(`Restored ownership: ${dir}`);
  }

  ok("Permission fix completed.");
}
