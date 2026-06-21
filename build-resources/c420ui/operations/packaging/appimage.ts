import path from "node:path";
import { exists as pathExists } from "../../host/paths.js";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { runC420UIRustArtifactFileOps } from "../../src/rust-artifacts.js";
import { runC420UIRustFsOps } from "../../src/rust-fs.js";
import { requireC420UIRustCommands } from "../../src/rust-preflight.js";
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

export async function runBuildAppImage(
  argv: string[],
  options: {
    artifactPattern: {
      startsWith: string;
      endsWith: string;
    };
  },
): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);

  await requireC420UIRustCommands({
    rootDir,
    commands: ["node", "npm", "sha256sum"],
    env: process.env,
  });

  const distDir = path.join(rootDir, "dist");

  printAppImageBundleNotice();

  info("Cleaning previous AppImage artifacts");
  if (!dryRun) {
    await runC420UIRustArtifactFileOps({
      rootDir,
      distDir,
      cleanup: [".AppImage", ".AppImage.sha256"],
      env: process.env,
    });
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

  const artifactResult = await runC420UIRustArtifactFileOps({
    rootDir,
    distDir,
    find: {
      startsWith: options.artifactPattern.startsWith,
      endsWith: options.artifactPattern.endsWith,
      expect: "one",
    },
    env: process.env,
  });
  if (!artifactResult.selected) {
    throw new Error("Expected exactly one generated AppImage matching the configured artifact pattern");
  }
  const appImagePath = artifactResult.selected;
  const appImageSha256Path = `${appImagePath}.sha256`;

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
    await runC420UIRustFsOps({
      rootDir,
      operations: [{ kind: "write-file", path: appImageSha256Path, content: shaStdout, mode: 0o644 }],
      env: process.env,
    });
    ok(`AppImage checksum generated: ${appImageSha256Path}`);
  } else {
    throw new Error("Failed to generate checksum");
  }

  writeBuildMetadataSidecar(appImagePath, { rootDir });

  if (pathExists(`${appImagePath}.build-metadata.json`)) {
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
