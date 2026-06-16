import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { info, ok, warn, error } from "../../host/ui.js";
import { parseDryRun } from "../../host/dry-run.js";
import { writeBuildMetadataSidecar } from "../install/build-metadata-marker.js";
import {
  printAppImageBundleNotice,
  printAppImageGuidance,
} from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runBuildAppImage(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);

  requireCommands(["node", "npm", "sha256sum"]);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const version = packageJson.version;
  const distDir = path.join(rootDir, "dist");

  printAppImageBundleNotice();

  info("Cleaning previous AppImage artifacts");
  if (!dryRun) {
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      if (file.endsWith(".AppImage") || file.endsWith(".AppImage.sha256")) {
        fs.unlinkSync(path.join(distDir, file));
      }
    }
  }

  info("Building AppImage with electron-builder");
  if (dryRun) {
    info("[dry-run] npm run build:metadata:effective");
    info("[dry-run] npm run dist:appimage");
  } else {
    const r1 = await runC420UIRustProcess({
      rootDir,
      command: "npm",
      args: ["run", "build:metadata:effective"],
      cwd: rootDir,
      env: process.env,
      label: "build:metadata:effective",
      emitLog,
      emitProgress: () => {},
    });
    if (r1.code !== 0) throw new Error("build:metadata:effective failed");

    const r2 = await runC420UIRustProcess({
      rootDir,
      command: "npm",
      args: ["run", "dist:appimage"],
      cwd: rootDir,
      env: process.env,
      label: "dist:appimage",
      emitLog,
      emitProgress: () => {},
    });
    if (r2.code !== 0) throw new Error("dist:appimage failed");
  }

  if (dryRun) {
    ok("AppImage build simulated");
    return;
  }

  const appimageCandidates = fs
    .readdirSync(distDir)
    .filter(
      (file) => file.startsWith(`canva-linux-${version}-`) && file.endsWith(".AppImage"),
    );

  if (appimageCandidates.length !== 1) {
    throw new Error(
      `Expected exactly one generated AppImage matching dist/canva-linux-${version}-*.AppImage, found ${appimageCandidates.length}`,
    );
  }

  const appImagePath = path.join(distDir, appimageCandidates[0]);
  const appImageSha256Path = `${appImagePath}.sha256`;

  if (!fs.existsSync(appImagePath) || fs.statSync(appImagePath).size === 0) {
    throw new Error(`Expected AppImage was not generated: ${appImagePath}`);
  }

  let shaStdout = "";
  const shaResult = await runC420UIRustProcess({
    rootDir,
    command: "sha256sum",
    args: [path.basename(appImagePath)],
    cwd: distDir,
    env: process.env,
    label: "sha256sum",
    emitLog: (event) => {
      if (event.source === "stdout") shaStdout += event.line + "\n";
      emitLog(event);
    },
    emitProgress: () => {},
  });

  if (shaResult.code === 0 && shaStdout.trim()) {
    fs.writeFileSync(appImageSha256Path, shaStdout, "utf8");
    ok(`AppImage checksum generated: ${appImageSha256Path}`);
  } else {
    throw new Error("Failed to generate checksum");
  }

  writeBuildMetadataSidecar(appImagePath, { rootDir });

  if (fs.existsSync(`${appImagePath}.build-metadata.json`)) {
    ok(`AppImage metadata generated: ${appImagePath}.build-metadata.json`);
  } else {
    warn(
      "Build metadata not found; AppImage full version detection will fall back to artifact name.",
    );
  }

  await runC420UIRustProcess({
    rootDir,
    command: "npm",
    args: ["run", "validate:appimage", "--", "--skip-release-manifest"],
    cwd: rootDir,
    env: process.env,
    label: "validate:appimage",
    emitLog,
    emitProgress: () => {},
  });

  printAppImageGuidance(appImagePath);
  ok(`AppImage generated at ${appImagePath}`);
}
