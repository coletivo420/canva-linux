import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDryRun } from "../../host/dry-run.js";
import { info, ok, error, warn } from "../../host/ui.js";
import { resolveNativeScope } from "../install/native-paths.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import type { c420uiLogEvent } from "../../src/events.js";

const APP_EXECUTABLE = "canva-linux";
const APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runNativeUninstall(argv: string[]): Promise<void> {
  const { dryRun } = parseDryRun(argv);
  const mode = argv.includes("--all") ? "all" : "scope";
  const purgeData = argv.includes("--purge-data");
  const rootDir = projectRoot();

  if (mode === "all") {
    await uninstallNativeSystem(rootDir, dryRun);
    await uninstallNativeUser(dryRun);
  } else {
    const scope = resolveNativeScope(process.env);
    if (scope === "system") await uninstallNativeSystem(rootDir, dryRun);
    else await uninstallNativeUser(dryRun);
  }

  if (purgeData) {
    cleanupNativeUserData(dryRun);
    ok("Native user data removed");
  }

  ok("Native uninstall complete");
}

async function uninstallNativeSystem(rootDir: string, dryRun: boolean): Promise<void> {
  const prefix = "/opt/canva-linux";
  const bin = `/usr/local/bin/${APP_EXECUTABLE}`;
  const desktop = `/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`;

  for (const target of [prefix, bin, desktop]) {
    if (dryRun) {
      info(`[dry-run] sudo rm -rf ${target}`);
      continue;
    }
    const result = await runC420UIRustProcess({
      rootDir,
      command: "sudo",
      args: ["rm", "-rf", target],
      cwd: rootDir,
      env: process.env,
      label: `remove ${target}`,
      emitLog,
      emitProgress: () => {},
    });
    if (result.code !== 0) throw new Error(`Failed to remove ${target}`);
  }
  ok("Native system uninstall complete");
}

async function uninstallNativeUser(dryRun: boolean): Promise<void> {
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
