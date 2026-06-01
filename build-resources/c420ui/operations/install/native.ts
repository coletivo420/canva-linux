import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { parseDryRun } from "../../host/dry-run";
import { projectRoot } from "../../host/paths";
import { requireCommands } from "../../host/preflight";
import { runCommand } from "../../host/command-runner";
import { info, ok, section, warn } from "../../host/ui";
import { resolveNativeScope, type NativeScope } from "./native-paths";
import {
  c420uiSudoChmod,
  c420uiSudoCp,
  c420uiSudoLn,
  c420uiSudoMkdir,
  c420uiSudoRm,
  c420uiSudoValidate,
} from "../host/sudo";
import { installBuildMetadataMarker } from "./build-metadata-marker";
import { writeDesktopFile } from "./desktop-entry";
import { installIcons } from "./icons";
import { updateDesktopCaches } from "./desktop-cache";
import { printNativePostInstallGuidance } from "../host/guidance";

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
    warn(
      "Administrator authorization will be requested to write to /opt, /usr/local/bin and /usr/local/share.",
    );
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

  installNativeFromDist(distUnpacked, installPaths, scope, { dryRun, rootDir });

  const buildMetadataTarget = path.join(
    installPaths.prefix,
    "config/canva-linux/build-metadata.json",
  );
  installBuildMetadataMarker(buildMetadataTarget, scope, { dryRun, rootDir });

  const versionMarker = process.env.PROJECT_PHASE || "unknown";
  if (scope === "system") {
    c420uiSudoRunText(
      versionMarker,
      path.join(installPaths.prefix, "CANVA_LINUX_VERSION"),
      { dryRun },
    );
  } else {
    if (dryRun) {
      console.log(
        `[dry-run] printf "%s\n" "${versionMarker}" > ${path.join(installPaths.prefix, "CANVA_LINUX_VERSION")}`,
      );
    } else {
      fs.writeFileSync(
        path.join(installPaths.prefix, "CANVA_LINUX_VERSION"),
        `${versionMarker}\n`,
        "utf8",
      );
    }
  }

  const tmpDesktop = path.join(os.tmpdir(), `canva-linux-${Date.now()}.desktop`);
  if (dryRun) {
    console.log(`[dry-run] build desktop file at ${tmpDesktop}`);
  } else {
    writeDesktopFile(
      tmpDesktop,
      path.join(installPaths.prefix, APP_EXECUTABLE),
      APP_ID,
    );
  }

  if (scope === "system") {
    c420uiSudoInstallDesktop(tmpDesktop, installPaths.desktop, { dryRun });
  } else {
    if (dryRun) {
      console.log(`[dry-run] install -Dm644 ${tmpDesktop} ${installPaths.desktop}`);
    } else {
      fs.mkdirSync(path.dirname(installPaths.desktop), { recursive: true });
      fs.copyFileSync(tmpDesktop, installPaths.desktop);
      fs.chmodSync(installPaths.desktop, 0o644);
    }
  }
  if (!dryRun && fs.existsSync(tmpDesktop)) fs.unlinkSync(tmpDesktop);

  const iconSrc = path.join(
    rootDir,
    "build-resources/canva-linux/assets/icons/hicolor",
  );
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
  } else {
    const home = os.homedir();
    return {
      prefix: path.join(home, ".local/opt/canva-linux"),
      bin: path.join(home, `.local/bin/${APP_EXECUTABLE}`),
      desktop: path.join(
        home,
        `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`,
      ),
      iconRoot: path.join(home, ".local/share/icons/hicolor"),
    };
  }
}

function installNativeFromDist(
  distDir: string,
  paths: ReturnType<typeof resolveInstallPaths>,
  scope: NativeScope,
  options: { dryRun?: boolean; rootDir?: string },
) {
  const { dryRun } = options;

  if (scope === "system") {
    c420uiSudoRm(paths.prefix, { dryRun });
    c420uiSudoMkdir(paths.prefix, { dryRun });
    c420uiSudoMkdir(path.dirname(paths.bin), { dryRun });
    c420uiSudoMkdir(path.dirname(paths.desktop), { dryRun });
    c420uiSudoCp(`${distDir}/.`, paths.prefix, { dryRun });
    c420uiSudoChmod("a+rX", paths.prefix, { dryRun });
    c420uiSudoLn(path.join(paths.prefix, APP_EXECUTABLE), paths.bin, { dryRun });
  } else {
    if (dryRun) {
      console.log(`[dry-run] rm -rf ${paths.prefix}`);
      console.log(`[dry-run] mkdir -p ${paths.prefix} ...`);
      console.log(`[dry-run] cp -a ${distDir}/. ${paths.prefix}/`);
      console.log(`[dry-run] ln -sfn ${path.join(paths.prefix, APP_EXECUTABLE)} ${paths.bin}`);
    } else {
      if (fs.existsSync(paths.prefix)) {
        fs.rmSync(paths.prefix, { recursive: true, force: true });
      }
      fs.mkdirSync(paths.prefix, { recursive: true });
      fs.mkdirSync(path.dirname(paths.bin), { recursive: true });
      fs.mkdirSync(path.dirname(paths.desktop), { recursive: true });

      // Recursive copy dist dir
      const copyRecursive = (src: string, dest: string) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest);
          fs.readdirSync(src).forEach((child) => {
            copyRecursive(path.join(src, child), path.join(dest, child));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      fs.readdirSync(distDir).forEach((child) => {
        copyRecursive(path.join(distDir, child), path.join(paths.prefix, child));
      });

      if (fs.existsSync(paths.bin)) fs.unlinkSync(paths.bin);
      fs.symlinkSync(path.join(paths.prefix, APP_EXECUTABLE), paths.bin);
    }
  }
}

function c420uiSudoRunText(
  text: string,
  target: string,
  options: { dryRun?: boolean },
) {
  const { dryRun } = options;
  if (dryRun) {
    console.log(`[dry-run] printf "%s\n" "${text}" | sudo tee ${target}`);
    return;
  }
  const result = spawnSync(
    "bash",
    [
      "build-resources/c420ui/host/linux/sudo-helper.sh",
      "tee",
      target,
    ],
    { input: `${text}\n`, stdio: ["pipe", "ignore", "inherit"] },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to write version marker to ${target} with sudo`);
  }
}

function c420uiSudoInstallDesktop(
  src: string,
  dst: string,
  options: { dryRun?: boolean },
) {
  const { dryRun } = options;
  if (dryRun) {
    console.log(`[dry-run] sudo install -Dm644 ${src} ${dst}`);
    return;
  }
  const result = spawnSync(
    "bash",
    [
      "build-resources/c420ui/host/linux/sudo-helper.sh",
      "install",
      "-Dm644",
      src,
      dst,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to install desktop file to ${dst} with sudo`);
  }
}
