import fs from "node:fs";
import path from "node:path";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { runCommand } from "../../host/command-runner.js";
import { info, ok, section, warn } from "../../host/ui.js";
import { resolveFlatpakScope } from "../flatpak/scope.js";
import { ensureFlathubRuntime } from "../flatpak/runtime.js";
import { installFlatpakDirect } from "../flatpak/repo.js";
import { printFlatpakPostInstallGuidance } from "../host/guidance.js";

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

export function runFlatpakInstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun, skipElectronBuild } = parseFlatpakInstallArgs(argv);
  const scope = resolveFlatpakScope(process.env);

  requireCommands(["flatpak", "flatpak-builder"]);
  if (!skipElectronBuild) requireCommands(["npm"]);

  info(`Flatpak install scope: ${scope}`);
  section(scope === "system" ? "System-wide Flatpak installation" : "User Flatpak installation");

  ensureFlathubRuntime(scope, { dryRun, rootDir });

  if (!skipElectronBuild) {
    info("Building Electron app (target: dir)");
    runCommand("npm", ["run", "build:metadata:effective"], { cwd: rootDir, dryRun });
    runCommand("npm", ["run", "dist"], { cwd: rootDir, dryRun });
  } else {
    warn("Skipping Electron build (--skip-electron-build)");
  }

  ensureLinuxUnpacked(rootDir, { dryRun });
  installFlatpakDirect(rootDir, scope, { dryRun });

  printFlatpakPostInstallGuidance();
  ok(`Flatpak ${scope} install completed`);
}

function ensureLinuxUnpacked(rootDir: string, options: { dryRun?: boolean }) {
  if (options.dryRun) return;
  const distDir = path.join(rootDir, "dist");
  if (!fs.existsSync(distDir)) {
    throw new Error("Folder 'dist' was not found. Did the Electron build fail?");
  }
  const unpackedDir = fs.readdirSync(distDir).find((d) => d.includes("unpacked"));

  if (!unpackedDir) {
    throw new Error("Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?");
  }

  if (unpackedDir !== "linux-unpacked") {
    info(`Creating symlink dist/linux-unpacked -> ${unpackedDir}`);
    const linkPath = path.join(distDir, "linux-unpacked");
    if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true, force: true });
    fs.symlinkSync(unpackedDir, linkPath);
  }

  ok(`Electron build output ready: dist/${unpackedDir}`);
}
