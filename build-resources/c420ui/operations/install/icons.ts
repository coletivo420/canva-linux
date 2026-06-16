import fs from "node:fs";
import path from "node:path";
import { info, warn } from "../../host/ui.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustFsOps, type c420uiRustFsOperation } from "../../src/rust-fs.js";

export async function installIconFile(
  scope: "system" | "user",
  src: string,
  dst: string,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = options.dryRun ?? false;
  const rootDir = projectRoot();
  await runC420UIRustFsOps({
    rootDir,
    operations: [
      {
        kind: scope === "system" ? "install-file" : "copy-file",
        from: src,
        to: dst,
        mode: 0o644,
      },
    ],
    dryRun,
    allowSudo: scope === "system",
    env: process.env,
  });
}

export async function installIcons(
  scope: "system" | "user",
  appId: string,
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
  const rootDir = projectRoot();
  const operations: c420uiRustFsOperation[] = [];

  for (const size of sizes) {
    let src = "";
    const sizePath = path.join(srcRoot, `${size}.png`);
    const sizeAppsPath = path.join(srcRoot, `${size}/apps/${appId}.png`);

    if (fs.existsSync(sizePath)) {
      src = sizePath;
    } else if (fs.existsSync(sizeAppsPath)) {
      src = sizeAppsPath;
    }

    if (src) {
      const dst = path.join(targetIconRoot, `${size}/apps/${appId}.png`);
      operations.push({
        kind: scope === "system" ? "install-file" : "copy-file",
        from: src,
        to: dst,
        mode: 0o644,
      });
      installedCount++;
    }
  }

  if (installedCount === 0) {
    warn(
      `No native icon sources found under ${srcRoot}; continuing without installing icons.`,
    );
  } else {
    await runC420UIRustFsOps({
      rootDir,
      operations,
      dryRun: options.dryRun,
      allowSudo: scope === "system",
      env: process.env,
    });
    info(`Installed ${installedCount} icons to ${targetIconRoot}`);
  }
}
