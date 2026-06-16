import os from "node:os";
import path from "node:path";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { projectRoot } from "../../host/paths.js";
import { info, ok, warn, error } from "../../host/ui.js";
import type { c420uiLogEvent } from "../../src/events.js";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function updateDesktopCaches(
  scope: "system" | "user",
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = options.dryRun ?? false;
  const rootDir = projectRoot();

  if (scope === "system") {
    if (dryRun) {
      info("[dry-run] sudo update-desktop-database /usr/local/share/applications");
    } else {
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["update-desktop-database", "/usr/local/share/applications"],
        cwd: rootDir,
        env: process.env,
        label: "update-desktop-database-system",
        emitLog: () => {}, // silent
        emitProgress: () => {},
      });
    }
  } else {
    const home = os.homedir();
    const userDesktopDir = path.join(home, ".local/share/applications");
    if (dryRun) {
      info(`[dry-run] update-desktop-database ${userDesktopDir}`);
    } else {
      await runC420UIRustProcess({
        rootDir,
        command: "update-desktop-database",
        args: [userDesktopDir],
        cwd: rootDir,
        env: process.env,
        label: "update-desktop-database-user",
        emitLog: () => {}, // silent
        emitProgress: () => {},
      });
    }
  }
}
