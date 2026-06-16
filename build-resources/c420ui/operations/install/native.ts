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
import { writeDesktopFile } from "./desktop-entry.js";
import { installIcons } from "./icons.js";
import { updateDesktopCaches } from "./desktop-cache.js";
import { printNativePostInstallGuidance } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

function loadNativeInstallConfig(rootDir: string): c420uiNativeInstallConfig {
  const configPath = path.join(rootDir, "build-resources/canva-linux/config/install-native.json");
  return validateC420UINativeInstallConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
}

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runNativeInstall(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = resolveNativeScope(process.env);
  const nativeInstall = loadNativeInstallConfig(rootDir);

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

  const buildMetadataTarget = path.join(installPaths.prefix, "config/canva-linux/build-metadata.json");
  await installBuildMetadataMarker(buildMetadataTarget, scope, { dryRun, rootDir });

  const versionMarker = process.env.PROJECT_PHASE || "unknown";
  const versionTarget = path.join(installPaths.prefix, "CANVA_LINUX_VERSION");
  if (scope === "system") {
    const tmpVersionMarker = path.join(os.tmpdir(), `canva-linux-version-${Date.now()}`);
    try {
      if (!dryRun) {
        fs.writeFileSync(tmpVersionMarker, `${versionMarker}\n`, "utf8");
      }
      if (dryRun) {
        info(`[dry-run] sudo install -Dm644 ${tmpVersionMarker} ${versionTarget}`);
      } else {
        const res = await runC420UIRustProcess({
          rootDir,
          command: "sudo",
          args: ["install", "-Dm644", tmpVersionMarker, versionTarget],
          cwd: rootDir,
          env: process.env,
          label: "install-version-marker",
          emitLog,
          emitProgress: () => {},
        });
        if (res.code !== 0) {
          throw new Error(`Failed to write version marker to ${versionTarget}`);
        }
      }
    } finally {
      if (!dryRun) fs.rmSync(tmpVersionMarker, { force: true });
    }
  } else if (dryRun) {
    console.log(`[dry-run] printf "%s\\n" "${versionMarker}" > ${versionTarget}`);
  } else {
    await runC420UIRustFsOps({
      rootDir,
      operations: [{ kind: "write-file", path: versionTarget, content: `${versionMarker}\n`, mode: 0o644 }],
      env: process.env,
    });
  }

  const tmpDesktop = path.join(os.tmpdir(), `canva-linux-${Date.now()}.desktop`);
  if (dryRun) {
    console.log(`[dry-run] build desktop file at ${tmpDesktop}`);
  } else {
    writeDesktopFile(tmpDesktop, path.join(installPaths.prefix, nativeInstall.executable), nativeInstall.appId);
  }

  if (scope === "system") {
    if (dryRun) {
      info(`[dry-run] sudo install -Dm644 ${tmpDesktop} ${installPaths.desktop}`);
    } else {
      const res = await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["install", "-Dm644", tmpDesktop, installPaths.desktop],
        cwd: rootDir,
        env: process.env,
        label: "install-desktop-file",
        emitLog,
        emitProgress: () => {},
      });
      if (res.code !== 0) {
        throw new Error(`Failed to install desktop file: ${installPaths.desktop}`);
      }
    }
  } else if (dryRun) {
    console.log(`[dry-run] install -Dm644 ${tmpDesktop} ${installPaths.desktop}`);
  } else {
    await runC420UIRustFsOps({
      rootDir,
      operations: [{ kind: "install-file", from: tmpDesktop, to: installPaths.desktop, mode: 0o644 }],
      env: process.env,
    });
  }
  if (!dryRun && fs.existsSync(tmpDesktop)) fs.rmSync(tmpDesktop, { force: true });

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

  if (scope === "system") {
    if (dryRun) {
      info(`[dry-run] sudo rm -rf ${paths.prefix}`);
      info(`[dry-run] sudo mkdir -p ${paths.prefix}`);
      info(`[dry-run] sudo mkdir -p ${path.dirname(paths.bin)}`);
      info(`[dry-run] sudo mkdir -p ${path.dirname(paths.desktop)}`);
      info(`[dry-run] sudo cp -a ${distDir}/. ${paths.prefix}`);
      info(`[dry-run] sudo chmod -R a+rX ${paths.prefix}`);
      info(`[dry-run] sudo ln -sfn ${path.join(paths.prefix, executable)} ${paths.bin}`);
    } else {
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["rm", "-rf", paths.prefix],
        cwd: rootDir,
        env: process.env,
        label: "rm-prefix",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["mkdir", "-p", paths.prefix],
        cwd: rootDir,
        env: process.env,
        label: "mkdir-prefix",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["mkdir", "-p", path.dirname(paths.bin)],
        cwd: rootDir,
        env: process.env,
        label: "mkdir-bin",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["mkdir", "-p", path.dirname(paths.desktop)],
        cwd: rootDir,
        env: process.env,
        label: "mkdir-desktop",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["cp", "-a", `${distDir}/.`, paths.prefix],
        cwd: rootDir,
        env: process.env,
        label: "cp-dist",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["chmod", "-R", "a+rX", paths.prefix],
        cwd: rootDir,
        env: process.env,
        label: "chmod-prefix",
        emitLog,
        emitProgress: () => {},
      });
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["ln", "-sfn", path.join(paths.prefix, executable), paths.bin],
        cwd: rootDir,
        env: process.env,
        label: "ln-bin",
        emitLog,
        emitProgress: () => {},
      });
    }
    return;
  }

  await runC420UIRustFsOps({
    rootDir,
    operations: [
      { kind: "remove", path: paths.prefix, recursive: true, force: true },
      { kind: "ensure-dir", path: paths.prefix },
      { kind: "ensure-dir", path: path.dirname(paths.bin) },
      { kind: "ensure-dir", path: path.dirname(paths.desktop) },
      { kind: "copy-tree", from: distDir, to: paths.prefix },
      { kind: "symlink", from: path.join(paths.prefix, executable), to: paths.bin, force: true },
    ],
    dryRun,
    env: process.env,
  });
}
