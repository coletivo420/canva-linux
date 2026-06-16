import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../../host/paths.js";
import { requireCommands } from "../../host/preflight.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { info, ok, warn, error } from "../../host/ui.js";
import { parseDryRun } from "../../host/dry-run.js";
import { writeBuildMetadataSidecar } from "../install/build-metadata-marker.js";
import { resolveFlatpakScope } from "../flatpak/scope.js";
import { ensureFlathubRuntime } from "../flatpak/runtime.js";
import { buildFlatpakRepo, repoHasAppRef } from "../flatpak/repo.js";
import { printFlatpakBundleNotice } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

const APP_ID = "io.github.coletivo420.canva-linux";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function runBuildFlatpakBundle(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const useExistingRepo = argv.includes("--use-existing-repo");
  const scope = resolveFlatpakScope(process.env);

  requireCommands(["flatpak", "flatpak-builder", "npm", "node", "realpath", "stat"]);

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = packageJson.version;
  const distDir = path.join(rootDir, "dist");

  const flatpakArchResult = spawnSync("flatpak", ["--default-arch"], { encoding: "utf8" });
  const flatpakArch = flatpakArchResult.stdout?.trim();
  if (flatpakArchResult.status !== 0 || !flatpakArch) {
    throw new Error("Failed to detect Flatpak architecture using 'flatpak --default-arch'");
  }
  const bundlePath = path.join(distDir, `canva-linux-${version}-${flatpakArch}.flatpak`);

  info(`Generating Flatpak bundle for version ${version} (${flatpakArch})`);
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

  if (useExistingRepo) {
    if (!repoHasAppRef(rootDir)) {
      throw new Error("repo/ is missing or does not contain io.github.coletivo420.canva-linux refs");
    }
    info("Using existing repo/ directory by explicit request");
  } else {
    printFlatpakBundleNotice();
    await ensureFlathubRuntime(scope, { dryRun, rootDir });
    info("Building Electron app (target: dir)");
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
    ensureLinuxUnpacked(rootDir, { dryRun });
    await buildFlatpakRepo(rootDir, scope, { dryRun });
  }

  if (!dryRun) {
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    if (fs.existsSync(bundlePath)) fs.rmSync(bundlePath, { recursive: true, force: true });

    const result = await runC420UIRustProcess({
      rootDir,
      command: "flatpak",
      args: [
        "build-bundle",
        "repo",
        bundlePath,
        APP_ID,
        `--arch=${flatpakArch}`,
        "--runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo",
      ],
      cwd: rootDir,
      env: process.env,
      label: "flatpak build-bundle",
      emitLog,
      emitProgress: () => {},
    });

    if (result.code !== 0) {
      throw new Error(`flatpak build-bundle failed with status ${result.code}`);
    }

    if (!fs.existsSync(bundlePath) || fs.statSync(bundlePath).size === 0) {
      throw new Error(`Expected Flatpak bundle was not generated: ${bundlePath}`);
    }

    const size = fs.statSync(bundlePath).size;
    ok(`Bundle generated: ${bundlePath}`);
    ok(`Bundle size: ${size} bytes`);
  } else {
    ok("Flatpak bundle build simulated");
  }

  if (useExistingRepo) {
    const sidecarPath = `${bundlePath}.build-metadata.json`;
    const tmpMetadata = path.join(os.tmpdir(), `flatpak-metadata-${Date.now()}.json`);
    if (extractFlatpakRepoBuildMetadata(rootDir, tmpMetadata)) {
      fs.copyFileSync(tmpMetadata, sidecarPath);
      ok(`Flatpak bundle metadata generated from reused repo: ${sidecarPath}`);
    } else {
      if (fs.existsSync(sidecarPath)) fs.rmSync(sidecarPath, { force: true });
      warn("Could not read build metadata from reused repo; Flatpak bundle sidecar was not generated.");
    }
    if (fs.existsSync(tmpMetadata)) fs.rmSync(tmpMetadata, { force: true });
  } else {
    writeBuildMetadataSidecar(bundlePath, { rootDir });
    if (fs.existsSync(`${bundlePath}.build-metadata.json`)) {
      ok(`Flatpak bundle metadata generated: ${bundlePath}.build-metadata.json`);
    } else {
      warn("Build metadata not found; Flatpak bundle full version detection will fall back to artifact name.");
    }
  }

  ok(".flatpak package generation completed.");
}

function ensureLinuxUnpacked(rootDir: string, options: { dryRun?: boolean }) {
  if (options.dryRun) return;
  const distDir = path.join(rootDir, "dist");
  const unpackedDir = fs.readdirSync(distDir).find((d) => d.includes("unpacked"));

  if (!unpackedDir) {
    throw new Error("Folder 'dist/linux*unpacked' was not found. Did the Electron build fail?");
  }

  if (unpackedDir !== "linux-unpacked") {
    info(`Creating symlink dist/linux-unpacked -> ${unpackedDir}`);
    const linkPath = path.join(distDir, "linux-unpacked");
    if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true, force: true });
    fs.symlinkSync(unpackedDir, linkPath);
  }

  ok(`Electron build output ready: dist/${unpackedDir}`);
}

function extractFlatpakRepoBuildMetadata(rootDir: string, outputPath: string): boolean {
  try {
    const refs = spawnSync("ostree", ["--repo=repo", "refs"], { cwd: rootDir, encoding: "utf8" });
    if (refs.status !== 0) return false;

    const archResult = spawnSync("flatpak", ["--default-arch"], { encoding: "utf8" });
    const flatpakArch = archResult.stdout?.trim();
    if (archResult.status !== 0 || !flatpakArch) return false;

    const ref = refs.stdout
      .split("\n")
      .filter((line) => line.startsWith(`app/${APP_ID}/${flatpakArch}/`))
      .sort()
      .pop();

    if (!ref) return false;

    const content = spawnSync("ostree", ["--repo=repo", "cat", ref, "/files/share/canva-linux/version"], {
      cwd: rootDir,
    });
    if (content.status === 0 && content.stdout.length > 0) {
      fs.writeFileSync(outputPath, content.stdout);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}
