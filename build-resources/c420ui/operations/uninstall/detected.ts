import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { info } from "../../host/ui";
import { detectInstallations } from "../detection/install-detection";
import { runNativeUninstall } from "./native";
import { runFlatpakUninstall } from "./flatpak";

export function runDetectedUninstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const detected = detectInstallations(rootDir);

  if (
    !detected.DETECTED_NATIVE_SYSTEM &&
    !detected.DETECTED_NATIVE_USER &&
    !detected.DETECTED_FLATPAK_SYSTEM &&
    !detected.DETECTED_FLATPAK_USER
  ) {
    info("No Native or Flatpak installations detected");
    return;
  }

  if (detected.DETECTED_NATIVE_SYSTEM) {
    const prev = process.env.CANVA_NATIVE_SCOPE;
    process.env.CANVA_NATIVE_SCOPE = "system";
    runNativeUninstall(dryRun ? ["--dry-run"] : []);
    process.env.CANVA_NATIVE_SCOPE = prev;
  }
  if (detected.DETECTED_NATIVE_USER) {
    const prev = process.env.CANVA_NATIVE_SCOPE;
    process.env.CANVA_NATIVE_SCOPE = "user";
    runNativeUninstall(dryRun ? ["--dry-run"] : []);
    process.env.CANVA_NATIVE_SCOPE = prev;
  }
  if (detected.DETECTED_FLATPAK_SYSTEM) {
    const prev = process.env.CANVA_FLATPAK_SCOPE;
    process.env.CANVA_FLATPAK_SCOPE = "system";
    runFlatpakUninstall(dryRun ? ["--dry-run"] : []);
    process.env.CANVA_FLATPAK_SCOPE = prev;
  }
  if (detected.DETECTED_FLATPAK_USER) {
    const prev = process.env.CANVA_FLATPAK_SCOPE;
    process.env.CANVA_FLATPAK_SCOPE = "user";
    runFlatpakUninstall(dryRun ? ["--dry-run"] : []);
    process.env.CANVA_FLATPAK_SCOPE = prev;
  }

  const after = detectInstallations(rootDir);
  info(`Detected installs: native(system=${after.DETECTED_NATIVE_SYSTEM}, user=${after.DETECTED_NATIVE_USER}), flatpak(system=${after.DETECTED_FLATPAK_SYSTEM}, user=${after.DETECTED_FLATPAK_USER}), appimage_artifacts=${after.DETECTED_APPIMAGE_ARTIFACTS}`);
}
