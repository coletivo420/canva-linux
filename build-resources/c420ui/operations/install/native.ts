import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDryRun } from "../../host/dry-run.js";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { runCommand } from "../../host/command-runner.js";
import { info, ok, section, warn } from "../../host/ui.js";
import { resolveNativeScope, type NativeScope } from "./native-paths.js";
import {
  c420uiSudoChmod,
  c420uiSudoCp,
  c420uiSudoInstall,
  c420uiSudoLn,
  c420uiSudoMkdir,
  c420uiSudoRm,
  c420uiSudoRun,
  c420uiSudoValidate,
} from "../../host/sudo.js";
import { installBuildMetadataMarker } from "./build-metadata-marker.js";
import { writeDesktopFile } from "./desktop-entry.js";
import { installIcons } from "./icons.js";
import { updateDesktopCaches } from "./desktop-cache.js";
import { printNativePostInstallGuidance } from "../host/guidance.js";

const APP_ID = "io.github.coletivo420.canva-linux";
const APP_EXECUTABLE = "canva-linux";
const APP_NATIVE_DESKTOP_NAME = `${APP_ID}.native.desktop`;

export function runNativeInstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = resolveNativeScope(process.env);

  requireCommands(["node", "npm", "bash"]);

  runCommand("npm", ["run", "build:metadata:effective"], { cwd: rootDir, dryRun });

  const installPaths = resolveInstallPaths(scope);

  if (scope === "system") {
    section("Native system install");
    info("The app will be available to all users on this machine.");
    warn("Administrator authorization will be requested to write to /opt, /usr/local/bin and /usr/local/share.");
    if (!dryRun) c420uiSudoValidate(rootDir);
  } else {
    section("Native user install");
    info("The app will be available only to the current user.");
    info("Administrator authorization should not be required.");
  }

  runCommand("npm", ["run", "dist"], { cwd: rootDir, dryRun });

  const distUnpacked = path.join(rootDir, "dist/linux-unpacked");
  if (!dryRun && !fs.existsSync(distUnpacked)) {
    throw new Error(`[error] ${distUnpacked} was not generated`);
  }

  installNativeFromDist(distUnpacked, installPaths, scope, { dryRun });

  const buildMetadataTarget = path.join(installPaths.prefix, "config/canva-linux/build-metadata.json");
  installBuildMetadataMarker(buildMetadataTarget, scope, { dryRun, rootDir });

  const versionMarker = process.env.PROJECT_PHASE || "unknown";
  const versionTarget = path.join(installPaths.prefix, "CANVA_LINUX_VERSION");
  if (scope === "system") {
    const tmpVersionMarker = path.join(os.tmpdir(), `canva-linux-version-${Date.now()}`);
    try {
      if (!dryRun) {
        fs.writeFileSync(tmpVersionMarker, `${versionMarker}\n`, "utf8");
      }
      if (c420uiSudoInstall(["-Dm644", tmpVersionMarker, versionTarget], { dryRun }) !== 0) {
        throw new Error(`Failed to write version marker to ${versionTarget}`);
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
    if (c420uiSudoInstall(["-Dm644", tmpDesktop, installPaths.desktop], { dryRun }) !== 0) {
      throw new Error(`Failed to install desktop file: ${installPaths.desktop}`);
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
  installIcons(scope, iconSrc, installPaths.iconRoot, { dryRun });

  updateDesktopCaches(scope, { dryRun });

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

function installNativeFromDist(
  distDir: string,
  paths: ReturnType<typeof resolveInstallPaths>,
  scope: NativeScope,
  options: { dryRun?: boolean },
) {
  const { dryRun } = options;

  if (scope === "system") {
    c420uiSudoRm(paths.prefix, { dryRun });
    c420uiSudoMkdir(paths.prefix, { dryRun });
    c420uiSudoMkdir(path.dirname(paths.bin), { dryRun });
    c420uiSudoMkdir(path.dirname(paths.desktop), { dryRun });
    c420uiSudoCp(`${distDir}/.`, paths.prefix, { dryRun });
    c420uiSudoChmod(["-R", "a+rX", paths.prefix], undefined, { dryRun });
    c420uiSudoLn(path.join(paths.prefix, APP_EXECUTABLE), paths.bin, { dryRun });
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
