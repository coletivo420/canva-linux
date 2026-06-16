import { spawnSync } from "node:child_process";
import { parseDryRun } from "../../host/dry-run.js";
import { info, ok, warn, error } from "../../host/ui.js";
import { detectInstallations } from "../detection/install-detection.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import type { c420uiLogEvent } from "../../src/events.js";

const APP_ID = "io.github.coletivo420.canva-linux";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runFlatpakUninstall(argv: string[]): Promise<void> {
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

  // Kill running app before uninstall
  if (!dryRun) {
    await runC420UIRustProcess({
      rootDir,
      command: "flatpak",
      args: ["kill", APP_ID],
      cwd: rootDir,
      env: process.env,
      label: "flatpak-kill",
      emitLog: () => {}, // silent kill
      emitProgress: () => {},
    });
  }

  const detected = detectInstallations(rootDir);

  switch (scope) {
    case "system":
      await uninstallSystem(rootDir, detected.DETECTED_FLATPAK_SYSTEM, dryRun);
      break;
    case "user":
      await uninstallUser(rootDir, detected.DETECTED_FLATPAK_USER, dryRun);
      break;
    case "all":
    case "":
      await uninstallUser(rootDir, detected.DETECTED_FLATPAK_USER, dryRun);
      await uninstallSystem(rootDir, detected.DETECTED_FLATPAK_SYSTEM, dryRun);
      break;
    default:
      throw new Error(`Invalid CANVA_FLATPAK_SCOPE: ${scope} (expected: user, system, all)`);
  }

  const after = detectInstallations(rootDir);
  info(`Detected installs: native(system=${after.DETECTED_NATIVE_SYSTEM}, user=${after.DETECTED_NATIVE_USER}), flatpak(system=${after.DETECTED_FLATPAK_SYSTEM}, user=${after.DETECTED_FLATPAK_USER}), appimage_artifacts=${after.DETECTED_APPIMAGE_ARTIFACTS}`);
}

async function uninstallSystem(rootDir: string, installed: boolean, dryRun: boolean): Promise<void> {
  if (!installed) {
    info("No Flatpak system install detected");
    return;
  }
  if (dryRun) {
    info("[dry-run] sudo flatpak uninstall --system -y io.github.coletivo420.canva-linux");
    ok("Flatpak system uninstall complete");
    return;
  }
  const result = await runC420UIRustProcess({
    rootDir,
    command: "sudo",
    args: ["flatpak", "uninstall", "--system", "-y", APP_ID],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-system-uninstall",
    emitLog,
    emitProgress: () => {},
  });
  if (result.code !== 0) warn("Flatpak system uninstall failed");
  else ok("Flatpak system uninstall complete");
}

async function uninstallUser(rootDir: string, installed: boolean, dryRun: boolean): Promise<void> {
  if (!installed) {
    info("No Flatpak user install detected");
    return;
  }
  if (dryRun) {
    info("[dry-run] flatpak uninstall --user -y io.github.coletivo420.canva-linux");
    ok("Flatpak user uninstall complete");
    return;
  }
  const result = await runC420UIRustProcess({
    rootDir,
    command: "flatpak",
    args: ["uninstall", "--user", "-y", APP_ID],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-user-uninstall",
    emitLog,
    emitProgress: () => {},
  });
  if (result.code !== 0) warn("Flatpak user uninstall failed");
  else ok("Flatpak user uninstall complete");
}
