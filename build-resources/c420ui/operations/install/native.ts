import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { info, ok, section, warn, error } from "../../host/ui.js";
import { resolveNativeScope, type NativeScope } from "./native-paths.js";
import {
  runC420UIRustSudoValidate,
} from "../../src/rust-maintenance.js";
import { runC420UIRustFsOps } from "../../src/rust-fs.js";
import { requireC420UIRustCommands } from "../../src/rust-preflight.js";
import { validateC420UINativeInstallConfig, type c420uiNativeInstallConfig } from "../../src/install-config.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { installBuildMetadataMarker } from "./build-metadata-marker.js";
import { buildDesktopFileContent } from "./desktop-entry.js";
import { installIcons } from "./icons.js";
import { updateDesktopCaches } from "./desktop-cache.js";
import { printNativePostInstallGuidance } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

function loadNativeInstallConfig(configPath: string): c420uiNativeInstallConfig {
  return validateC420UINativeInstallConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
}

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runNativeInstall(
  argv: string[],
  options: { configPath?: string } = {},
): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = resolveNativeScope(process.env);
  const nativeInstall = loadNativeInstallConfig(
    options.configPath ?? path.join(rootDir, "build-resources/canva-linux/config/install-native.json"),
  );

  await requireC420UIRustCommands({
    rootDir,
    commands: ["node", "npm", "bash"],
    env: process.env,
  });

  if (dryRun) {
    info("[dry-run] npm run build:metadata:effective");
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
  }

  const installPaths = resolveInstallPaths(scope, nativeInstall);

  if (scope === "system") {
    section("Native system install");
    info("The app will be available to all users on this machine.");
    warn("Administrator authorization will be requested to write to /opt, /usr/local/bin and /usr/local/share.");
    if (!dryRun) {
      const valid = await runC420UIRustSudoValidate({ rootDir, env: process.env });
      if (!valid) throw new Error("Sudo validation failed");
    }
  } else {
    section("Native user install");
    info("The app will be available only to the current user.");
    info("Administrator authorization should not be required.");
  }

  if (dryRun) {
    info("[dry-run] npm run dist");
  } else {
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

  const distUnpacked = path.join(rootDir, "dist/linux-unpacked");
  if (!dryRun && !fs.existsSync(distUnpacked)) {
    throw new Error(`[error] ${distUnpacked} was not generated`);
  }

  await installNativeFromDist(distUnpacked, installPaths, scope, {
    dryRun,
    rootDir,
    executable: nativeInstall.executable,
  });

  const buildMetadataTarget = path.join(installPaths.prefix, nativeInstall.buildMetadataTarget);
  await installBuildMetadataMarker(buildMetadataTarget, scope, { dryRun, rootDir });

  const versionMarker = process.env.PROJECT_PHASE || "unknown";
  const versionTarget = path.join(installPaths.prefix, nativeInstall.versionMarkerName);
  const desktopContent = buildDesktopFileContent({
    execPath: path.join(installPaths.prefix, nativeInstall.executable),
    iconName: nativeInstall.appId,
    ...nativeInstall.desktop,
  });
  await runC420UIRustFsOps({
    rootDir,
    operations: [
      { kind: "write-file", path: versionTarget, content: `${versionMarker}\n`, mode: 0o644 },
      { kind: "write-file", path: installPaths.desktop, content: desktopContent, mode: 0o644 },
    ],
    dryRun,
    allowSudo: scope === "system",
    env: process.env,
  });

  const iconSrc = path.join(rootDir, "build-resources/canva-linux/assets/icons/hicolor");
  await installIcons(scope, nativeInstall.appId, iconSrc, installPaths.iconRoot, { dryRun });

  await updateDesktopCaches(scope, { dryRun });

  printNativePostInstallGuidance();
  ok(`Native ${scope} install completed`);
}

function resolveInstallPaths(scope: NativeScope, config: c420uiNativeInstallConfig) {
  if (scope === "system") {
    return config.system;
  }

  const home = os.homedir();
  return {
    prefix: path.join(home, config.user.prefix),
    bin: path.join(home, config.user.bin),
    desktop: path.join(home, config.user.desktop),
    iconRoot: path.join(home, config.user.iconRoot),
  };
}

async function installNativeFromDist(
  distDir: string,
  paths: ReturnType<typeof resolveInstallPaths>,
  scope: NativeScope,
  options: { dryRun?: boolean; rootDir: string; executable: string },
) {
  const { dryRun, rootDir, executable } = options;

  await runC420UIRustFsOps({
    rootDir,
    operations: [
      { kind: "remove", path: paths.prefix, recursive: true, force: true },
      { kind: "ensure-dir", path: paths.prefix },
      { kind: "ensure-dir", path: path.dirname(paths.bin) },
      { kind: "ensure-dir", path: path.dirname(paths.desktop) },
      { kind: "copy-tree", from: distDir, to: paths.prefix },
      { kind: "symlink", from: path.join(paths.prefix, executable), to: paths.bin, force: true },
      { kind: "chmod", path: paths.prefix, mode: "755", recursive: true },
    ],
    dryRun,
    allowSudo: scope === "system",
    env: process.env,
  });
}
