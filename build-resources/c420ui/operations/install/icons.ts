import fs from "node:fs";
import path from "node:path";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { info, warn } from "../../host/ui.js";
import { projectRoot } from "../../host/paths.js";

const APP_ID = "io.github.coletivo420.canva-linux";

export async function installIconFile(
  scope: "system" | "user",
  src: string,
  dst: string,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = options.dryRun ?? false;
  const dstDir = path.dirname(dst);
  const rootDir = projectRoot();

  if (scope === "system") {
    if (dryRun) {
      info(`[dry-run] sudo install -Dm644 ${src} ${dst}`);
    } else {
      await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["install", "-Dm644", src, dst],
        cwd: rootDir,
        env: process.env,
        label: "install-icon",
        emitLog: () => {},
        emitProgress: () => {},
      });
    }
  } else {
    if (dryRun) {
      console.log(`[dry-run] install -Dm644 ${src} ${dst}`);
    } else {
      fs.mkdirSync(dstDir, { recursive: true });
      fs.copyFileSync(src, dst);
      fs.chmodSync(dst, 0o644);
    }
  }
}

export async function installIcons(
  scope: "system" | "user",
  srcRoot: string,
  targetIconRoot: string,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const sizes = [
    "16x16",
    "24x24",
    "32x32",
    "48x48",
    "64x64",
    "128x128",
    "256x256",
    "512x512",
  ];
  let installedCount = 0;

  for (const size of sizes) {
    let src = "";
    const sizePath = path.join(srcRoot, `${size}.png`);
    const sizeAppsPath = path.join(srcRoot, `${size}/apps/${APP_ID}.png`);

    if (fs.existsSync(sizePath)) {
      src = sizePath;
    } else if (fs.existsSync(sizeAppsPath)) {
      src = sizeAppsPath;
    }

    if (src) {
      const dst = path.join(targetIconRoot, `${size}/apps/${APP_ID}.png`);
      await installIconFile(scope, src, dst, options);
      installedCount++;
    }
  }

  if (installedCount === 0) {
    warn(
      `No native icon sources found under ${srcRoot}; continuing without installing icons.`,
    );
  } else {
    info(`Installed ${installedCount} icons to ${targetIconRoot}`);
  }
}
