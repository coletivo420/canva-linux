import { spawnSync } from "node:child_process";
import { parseDryRun } from "../../host/dry-run.js";
import { info, ok, warn } from "../../host/ui.js";
import { detectInstallations } from "../detection/install-detection.js";
import { projectRoot } from "../../host/paths.js";
import { c420uiSudoRun } from "../host/sudo.js";

const APP_ID = "io.github.coletivo420.canva-linux";

export function runFlatpakUninstall(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  const scope = process.env.CANVA_FLATPAK_SCOPE || "all";
  const rootDir = projectRoot();

  try {
    const hasFlatpak = spawnSync("flatpak", ["--version"], { stdio: "ignore" }).status === 0;
    if (!hasFlatpak) {
      info("Flatpak command not available; nothing to uninstall");
      return;
    }
  } catch {
    info("Flatpak command not available; nothing to uninstall");
    return;
  }

  spawnSync("flatpak", ["kill", APP_ID], { stdio: "ignore" });
  const detected = detectInstallations(rootDir);

  switch (scope) {
    case "system":
      uninstallSystem(detected.DETECTED_FLATPAK_SYSTEM, dryRun);
      break;
    case "user":
      uninstallUser(detected.DETECTED_FLATPAK_USER, dryRun);
      break;
    case "all":
    case "":
      uninstallUser(detected.DETECTED_FLATPAK_USER, dryRun);
      uninstallSystem(detected.DETECTED_FLATPAK_SYSTEM, dryRun);
      break;
    default:
      throw new Error(`Invalid CANVA_FLATPAK_SCOPE: ${scope} (expected: user, system, all)`);
  }

  const after = detectInstallations(rootDir);
  info(`Detected installs: native(system=${after.DETECTED_NATIVE_SYSTEM}, user=${after.DETECTED_NATIVE_USER}), flatpak(system=${after.DETECTED_FLATPAK_SYSTEM}, user=${after.DETECTED_FLATPAK_USER}), appimage_artifacts=${after.DETECTED_APPIMAGE_ARTIFACTS}`);
}

function uninstallSystem(installed: boolean, dryRun: boolean): void {
  if (!installed) {
    info("No Flatpak system install detected");
    return;
  }
  const status = c420uiSudoRun("flatpak", ["uninstall", "--system", "-y", APP_ID], { dryRun });
  if (status !== 0) warn("Flatpak system uninstall failed");
  else ok("Flatpak system uninstall complete");
}

function uninstallUser(installed: boolean, dryRun: boolean): void {
  if (!installed) {
    info("No Flatpak user install detected");
    return;
  }
  if (dryRun) {
    info("[dry-run] flatpak uninstall --user -y io.github.coletivo420.canva-linux");
    ok("Flatpak user uninstall complete");
    return;
  }
  const result = spawnSync("flatpak", ["uninstall", "--user", "-y", APP_ID], { stdio: "ignore" });
  if ((result.status ?? 1) !== 0) warn("Flatpak user uninstall failed");
  else ok("Flatpak user uninstall complete");
}
