import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectRoot } from "../../host/paths.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { runC420UIRustEnsureLinuxUnpacked, runC420UIRustFsOps } from "../../src/rust-fs.js";
import { requireC420UIRustCommands } from "../../src/rust-preflight.js";
import { info, ok, warn, error } from "../../host/ui.js";
import { parseDryRun } from "../../host/dry-run.js";
import { writeBuildMetadataSidecar } from "../install/build-metadata-marker.js";
import { resolveFlatpakScope } from "../flatpak/scope.js";
import { ensureFlathubRuntime } from "../flatpak/runtime.js";
import { buildFlatpakRepo, repoHasAppRef } from "../flatpak/repo.js";
import { printFlatpakBundleNotice } from "../host/guidance.js";
import type { c420uiLogEvent } from "../../src/events.js";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

async function runHostCommandCapture(options: {
  rootDir: string;
  command: string;
  args: string[];
  cwd?: string;
  label: string;
}): Promise<string> {
  let stdout = "";
  const result = await runC420UIRustProcess({
    rootDir: options.rootDir,
    command: options.command,
    args: options.args,
    cwd: options.cwd ?? options.rootDir,
    env: process.env,
    label: options.label,
    emitLog: (event) => {
      if (event.source === "stdout") stdout += `${event.line}\n`;
      else emitLog(event);
    },
    emitProgress: () => {},
  });
  if (result.code !== 0) {
    throw new Error(`${options.label} failed with status ${result.code}`);
  }
  return stdout;
}

export async function runBuildFlatpakBundle(argv: string[]): Promise<void> {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const useExistingRepo = argv.includes("--use-existing-repo");
  const scope = resolveFlatpakScope(process.env);

  await requireC420UIRustCommands({
    rootDir,
    commands: ["flatpak", "flatpak-builder", "npm", "node", "realpath", "stat"],
    env: process.env,
  });

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = packageJson.version;
  const appId = packageJson.build?.appId;
  if (typeof appId !== "string" || !appId) {
    throw new Error("package.json build.appId is required for Flatpak bundle generation");
  }
  const distDir = path.join(rootDir, "dist");

  const flatpakArch = (await runHostCommandCapture({
    rootDir,
    command: "flatpak",
    args: ["--default-arch"],
    label: "flatpak --default-arch",
  })).trim();
  if (!flatpakArch) throw new Error("Failed to detect Flatpak architecture using 'flatpak --default-arch'");
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
      throw new Error(`repo/ is missing or does not contain ${appId} refs`);
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
    await ensureLinuxUnpacked(rootDir, { dryRun });
    await buildFlatpakRepo(rootDir, scope, { dryRun });
  }

  if (!dryRun) {
    await runC420UIRustFsOps({
      rootDir,
      operations: [
        { kind: "ensure-dir", path: distDir },
        { kind: "remove", path: bundlePath, recursive: true, force: true },
      ],
      env: process.env,
    });

    const result = await runC420UIRustProcess({
      rootDir,
      command: "flatpak",
      args: [
        "build-bundle",
        "repo",
        bundlePath,
        appId,
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
    if (await extractFlatpakRepoBuildMetadata(rootDir, tmpMetadata, appId)) {
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

async function ensureLinuxUnpacked(rootDir: string, options: { dryRun?: boolean }) {
  const distDir = path.join(rootDir, "dist");
  const result = await runC420UIRustEnsureLinuxUnpacked({
    rootDir,
    distDir,
    dryRun: options.dryRun,
    env: process.env,
  });
  if (result.createdSymlink) {
    info(`${options.dryRun ? "[dry-run] " : ""}Creating symlink dist/${result.canonical} -> ${result.selected}`);
  }
  ok(`Electron build output ready: dist/${result.selected}`);
}

async function extractFlatpakRepoBuildMetadata(rootDir: string, outputPath: string, appId: string): Promise<boolean> {
  try {
    const refs = await runHostCommandCapture({
      rootDir,
      command: "ostree",
      args: ["--repo=repo", "refs"],
      label: "ostree refs",
    });
    const flatpakArch = (await runHostCommandCapture({
      rootDir,
      command: "flatpak",
      args: ["--default-arch"],
      label: "flatpak --default-arch",
    })).trim();
    if (!flatpakArch) return false;

    const ref = refs
      .split("\n")
      .filter((line) => line.startsWith(`app/${appId}/${flatpakArch}/`))
      .sort()
      .pop();

    if (!ref) return false;

    const content = await runHostCommandCapture({
      rootDir,
      command: "ostree",
      args: ["--repo=repo", "cat", ref, "/files/share/canva-linux/version"],
      label: "ostree cat build metadata",
    });
    if (content.length > 0) {
      await runC420UIRustFsOps({
        rootDir,
        operations: [{ kind: "write-file", path: outputPath, content, mode: 0o644 }],
        env: process.env,
      });
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}
