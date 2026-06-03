import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { c420uiSudoRun } from "../../host/sudo.js";

export function updateDesktopCaches(
  scope: "system" | "user",
  options: { dryRun?: boolean } = {},
): void {
  const dryRun = options.dryRun ?? false;

  try {
    const hasCommand =
      spawnSync("command", ["-v", "update-desktop-database"], {
        shell: true,
      }).status === 0;
    if (!hasCommand) return;

    if (scope === "system") {
      c420uiSudoRun(
        "update-desktop-database",
        ["/usr/local/share/applications"],
        { dryRun, stdio: "ignore" },
      );
    } else {
      const home = os.homedir();
      const userDesktopDir = path.join(home, ".local/share/applications");
      if (dryRun) {
        console.log(`[dry-run] update-desktop-database ${userDesktopDir}`);
      } else {
        spawnSync("update-desktop-database", [userDesktopDir], {
          stdio: "ignore",
        });
      }
    }
  } catch {
    // Ignore errors
  }
}
