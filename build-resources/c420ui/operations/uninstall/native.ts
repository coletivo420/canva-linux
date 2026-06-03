import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDryRun } from "../../host/dry-run.js";
import { info, ok } from "../../host/ui.js";
import { resolveNativeScope } from "../install/native-paths.js";
import { c420uiSudoRm } from "../../host/sudo.js";

const APP_EXECUTABLE = "canva-linux";
const APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";

export function runNativeUninstall(argv: string[]): void {
  const { dryRun } = parseDryRun(argv);
  const mode = argv.includes("--all") ? "all" : "scope";
  const purgeData = argv.includes("--purge-data");

  if (mode === "all") {
    uninstallNativeSystem(dryRun);
    uninstallNativeUser(dryRun);
  } else {
    const scope = resolveNativeScope(process.env);
    if (scope === "system") uninstallNativeSystem(dryRun);
    else uninstallNativeUser(dryRun);
  }

  if (purgeData) {
    cleanupNativeUserData(dryRun);
    ok("Native user data removed");
  }

  ok("Native uninstall complete");
}

function uninstallNativeSystem(dryRun: boolean): void {
  const prefix = "/opt/canva-linux";
  const bin = `/usr/local/bin/${APP_EXECUTABLE}`;
  const desktop = `/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`;

  c420uiSudoRm(prefix, { dryRun });
  c420uiSudoRm(bin, { dryRun });
  c420uiSudoRm(desktop, { dryRun });
  ok("Native system uninstall complete");
}

function uninstallNativeUser(dryRun: boolean): void {
  const home = os.homedir();
  const prefix = path.join(home, ".local/opt/canva-linux");
  const bin = path.join(home, `.local/bin/${APP_EXECUTABLE}`);
  const desktop = path.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`);

  removePath(prefix, dryRun);
  removePath(bin, dryRun);
  removePath(desktop, dryRun);
  ok("Native user uninstall complete");
}

function cleanupNativeUserData(dryRun: boolean): void {
  const home = os.homedir();
  const targets = [
    path.join(home, ".config/canva-linux"),
    path.join(home, ".cache/canva-linux"),
    path.join(home, ".local/share/canva-linux"),
    path.join(home, ".config", APP_EXECUTABLE),
    path.join(home, ".cache", APP_EXECUTABLE),
    path.join(home, ".local/share", APP_EXECUTABLE),
  ];

  for (const target of targets) removePath(target, dryRun);
}

function removePath(target: string, dryRun: boolean): void {
  if (dryRun) {
    info(`[dry-run] rm -rf ${target}`);
    return;
  }
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}
