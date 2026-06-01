import fs from "node:fs";
import path from "node:path";
import { c420uiSudoInstall } from "../host/sudo";
import { info, warn } from "../../host/ui";

const APP_ID = "io.github.coletivo420.canva-linux";

export function installIconFile(
  scope: "system" | "user",
  src: string,
  dst: string,
  options: { dryRun?: boolean } = {},
): void {
  const dryRun = options.dryRun ?? false;
  const dstDir = path.dirname(dst);

  if (scope === "system") {
    c420uiSudoInstall(["-Dm644", src, dst], { dryRun });
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

export function installIcons(
  scope: "system" | "user",
  srcRoot: string,
  targetIconRoot: string,
  options: { dryRun?: boolean } = {},
): void {
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
      installIconFile(scope, src, dst, options);
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
