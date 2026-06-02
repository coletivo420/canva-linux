import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { runCommand } from "../../host/command-runner.js";
import { info, ok, warn } from "../../host/ui.js";
import { parseDryRun } from "../../host/dry-run.js";
import { writeBuildMetadataSidecar } from "../install/build-metadata-marker.js";
import {
  printAppImageBundleNotice,
  printAppImageGuidance,
} from "../host/guidance.js";

export function runBuildAppImage(argv: string[]): void {
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
  runCommand("npm", ["run", "build:metadata:effective"], { cwd: rootDir, dryRun });
  runCommand("npm", ["run", "dist:appimage"], { cwd: rootDir, dryRun });

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

  const shaResult = spawnSync(
    "sha256sum",
    [path.basename(appImagePath)],
    { cwd: distDir, encoding: "utf8" },
  );
  if (shaResult.status === 0) {
    fs.writeFileSync(appImageSha256Path, shaResult.stdout, "utf8");
    ok(`AppImage checksum generated: ${appImageSha256Path}`);
  } else {
    throw new Error(`Failed to generate checksum: ${shaResult.stderr}`);
  }

  writeBuildMetadataSidecar(appImagePath, { rootDir });

  if (fs.existsSync(`${appImagePath}.build-metadata.json`)) {
    ok(`AppImage metadata generated: ${appImagePath}.build-metadata.json`);
  } else {
    warn(
      "Build metadata not found; AppImage full version detection will fall back to artifact name.",
    );
  }

  runCommand("npm", ["run", "validate:appimage", "--", "--skip-release-manifest"], {
    cwd: rootDir,
  });

  printAppImageGuidance(appImagePath);
  ok(`AppImage generated at ${appImagePath}`);
}
