import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { info, ok, section, warn, error } from "../../host/ui.js";
import { resolveNativeScope, type NativeScope } from "./native-paths.js";
import {
  runC420UIRustSudoValidate,
} from "../../src/rust-maintenance.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { installBuildMetadataMarker } from "./build-metadata-marker.js";
import { writeDesktopFile } from "./desktop-entry.js";
import { installIcons } from "./icons.js";
import { updateDesktopCaches } from "./desktop-cache.js";
import { printNativePostInstallGuidance } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

const APP_ID = "io.github.coletivo420.canva-linux";
const APP_EXECUTABLE = "canva-linux";
const APP_NATIVE_DESKTOP_NAME = `${APP_ID}.native.desktop`;

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runNativeInstall(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = resolveNativeScope(process.env);

  requireCommands(["node", "npm", "bash"]);

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

  const installPaths = resolveInstallPaths(scope);

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

  await installNativeFromDist(distUnpacked, installPaths, scope, { dryRun, rootDir });

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
    fs.writeFileSync(versionTarget, `${versionMarker}\n`, "utf8");
  }

  const tmpDesktop = path.join(os.tmpdir(), `canva-linux-${Date.now()}.desktop`);
  if (dryRun) {
    console.log(`[dry-run] build desktop file at ${tmpDesktop}`);
  } else {
    writeDesktopFile(tmpDesktop, path.join(installPaths.prefix, APP_EXECUTABLE), APP_ID);
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
    fs.mkdirSync(path.dirname(installPaths.desktop), { recursive: true });
    fs.copyFileSync(tmpDesktop, installPaths.desktop);
    fs.chmodSync(installPaths.desktop, 0o644);
  }
  if (!dryRun && fs.existsSync(tmpDesktop)) fs.rmSync(tmpDesktop, { force: true });

  const iconSrc = path.join(rootDir, "build-resources/canva-linux/assets/icons/hicolor");
  await installIcons(scope, iconSrc, installPaths.iconRoot, { dryRun });

  await updateDesktopCaches(scope, { dryRun });

  printNativePostInstallGuidance();
  ok(`Native ${scope} install completed`);
}

function resolveInstallPaths(scope: NativeScope) {
  if (scope === "system") {
    return {
      prefix: "/opt/canva-linux",
      bin: `/usr/local/bin/${APP_EXECUTABLE}`,
      desktop: `/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`,
      iconRoot: "/usr/local/share/icons/hicolor",
    };
  }

  const home = os.homedir();
  return {
    prefix: path.join(home, ".local/opt/canva-linux"),
    bin: path.join(home, `.local/bin/${APP_EXECUTABLE}`),
    desktop: path.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`),
    iconRoot: path.join(home, ".local/share/icons/hicolor"),
  };
}

async function installNativeFromDist(
  distDir: string,
  paths: ReturnType<typeof resolveInstallPaths>,
  scope: NativeScope,
  options: { dryRun?: boolean; rootDir: string },
) {
  const { dryRun, rootDir } = options;

  if (scope === "system") {
    if (dryRun) {
      info(`[dry-run] sudo rm -rf ${paths.prefix}`);
      info(`[dry-run] sudo mkdir -p ${paths.prefix}`);
      info(`[dry-run] sudo mkdir -p ${path.dirname(paths.bin)}`);
      info(`[dry-run] sudo mkdir -p ${path.dirname(paths.desktop)}`);
      info(`[dry-run] sudo cp -a ${distDir}/. ${paths.prefix}`);
      info(`[dry-run] sudo chmod -R a+rX ${paths.prefix}`);
      info(`[dry-run] sudo ln -sfn ${path.join(paths.prefix, APP_EXECUTABLE)} ${paths.bin}`);
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
        args: ["ln", "-sfn", path.join(paths.prefix, APP_EXECUTABLE), paths.bin],
        cwd: rootDir,
        env: process.env,
        label: "ln-bin",
        emitLog,
        emitProgress: () => {},
      });
    }
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] rm -rf ${paths.prefix}`);
    console.log(`[dry-run] mkdir -p ${paths.prefix} ...`);
    console.log(`[dry-run] cp -a ${distDir}/. ${paths.prefix}/`);
    console.log(`[dry-run] ln -sfn ${path.join(paths.prefix, APP_EXECUTABLE)} ${paths.bin}`);
    return;
  }

  if (fs.existsSync(paths.prefix)) fs.rmSync(paths.prefix, { recursive: true, force: true });
  fs.mkdirSync(paths.prefix, { recursive: true });
  fs.mkdirSync(path.dirname(paths.bin), { recursive: true });
  fs.mkdirSync(path.dirname(paths.desktop), { recursive: true });
  fs.cpSync(distDir, paths.prefix, { recursive: true });

  if (fs.existsSync(paths.bin)) fs.rmSync(paths.bin, { recursive: true, force: true });
  fs.symlinkSync(path.join(paths.prefix, APP_EXECUTABLE), paths.bin);
}
