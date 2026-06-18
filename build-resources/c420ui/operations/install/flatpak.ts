import path from "node:path";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { runC420UIRustSudoValidate } from "../../src/rust-maintenance.js";
import { runC420UIRustEnsureLinuxUnpacked } from "../../src/rust-fs.js";
import { requireC420UIRustCommands } from "../../src/rust-preflight.js";
import { info, ok, section, warn, error } from "../../host/ui.js";
import { resolveFlatpakScope } from "../flatpak/scope.js";
import { ensureFlathubRuntime } from "../flatpak/runtime.js";
import { installFlatpakDirect } from "../flatpak/repo.js";
import { printFlatpakPostInstallGuidance } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

function parseFlatpakInstallArgs(argv: string[]): { dryRun: boolean; skipElectronBuild: boolean } {
  const { dryRun } = parseDryRun(argv);
  const skipElectronBuild = argv.includes("--skip-electron-build");
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "--skip-electron-build") continue;
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: install-flatpak [--dry-run] [--skip-electron-build]");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { dryRun, skipElectronBuild };
}

export async function runFlatpakInstall(
  argv: string[],
  options: { appId: string },
): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun, skipElectronBuild } = parseFlatpakInstallArgs(argv);
  const scope = resolveFlatpakScope(process.env);

  await requireC420UIRustCommands({
    rootDir,
    commands: ["flatpak", "flatpak-builder", ...(skipElectronBuild ? [] : ["npm"])],
    env: process.env,
  });

  info(`Flatpak install scope: ${scope}`);
  section(scope === "system" ? "System-wide Flatpak installation" : "User Flatpak installation");

  if (scope === "system" && !dryRun) {
    const valid = await runC420UIRustSudoValidate({ rootDir, env: process.env });
    if (!valid) throw new Error("Sudo validation failed");
  }

  await ensureFlathubRuntime(scope, { dryRun, rootDir });

  if (!skipElectronBuild) {
    info("Building Electron app (target: dir)");
    if (dryRun) {
      info("[dry-run] npm run build:metadata:effective");
      info("[dry-run] npm run dist");
    } else {
      await runC420UIRustProcess({
        rootDir,
        command: "npm",
        args: ["run", "build:metadata:effective"],
        cwd: rootDir,
        env: process.env,
        label: "build:metadata:effective",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "npm",
        args: ["run", "dist"],
        cwd: rootDir,
        env: process.env,
        label: "dist",
        emitLog,
        emitProgress: () => {},
      });
    }
  } else {
    warn("Skipping Electron build (--skip-electron-build)");
  }

  await ensureLinuxUnpacked(rootDir, { dryRun });
  await installFlatpakDirect(rootDir, scope, { dryRun });

  printFlatpakPostInstallGuidance(options.appId);
  ok(`Flatpak ${scope} install completed`);
}

async function ensureLinuxUnpacked(rootDir: string, options: { dryRun?: boolean }) {
  const distDir = path.join(rootDir, "dist");
  const result = await runC420UIRustEnsureLinuxUnpacked({
    rootDir,
    distDir,
    dryRun: options.dryRun,
    env: process.env,
  });
  if (result.createdSymlink) {
    info(`${options.dryRun ? "[dry-run] " : ""}Creating symlink dist/${result.canonical} -> ${result.selected}`);
  }
  ok(`Electron build output ready: dist/${result.selected}`);
}
