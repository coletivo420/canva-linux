import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { requireCommands } from "../host/preflight";
import { runCommand } from "../host/command-runner";
import { info, ok } from "../host/ui";

export function runFlatpakInstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = process.env.CANVA_FLATPAK_SCOPE === "user" ? "user" : "system";

  requireCommands(["flatpak", "flatpak-builder", "bash"]);
  info(`Flatpak install scope: ${scope}`);

  runCommand("bash", ["scripts/install-flatpak-local.sh", ...argv], {
    cwd: rootDir,
    dryRun,
    env: { ...process.env, CANVA_FLATPAK_SCOPE: scope },
  });

  ok(`Flatpak ${scope} install completed`);
}
