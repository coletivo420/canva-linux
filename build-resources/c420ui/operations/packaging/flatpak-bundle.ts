import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "../../host/paths";
import { requireCommands } from "../../host/preflight";
import { runCommand } from "../../host/command-runner";
import { info, ok, warn } from "../../host/ui";
import { parseDryRun } from "../../host/dry-run";
import { writeBuildMetadataSidecar } from "../install/build-metadata-marker";
import { resolveFlatpakScope } from "../flatpak/scope";
import { ensureFlathubRuntime } from "../flatpak/runtime";
import { buildFlatpakRepo, repoHasAppRef } from "../flatpak/repo";
import { printFlatpakBundleNotice } from "../host/guidance";

const APP_ID = "io.github.coletivo420.canva-linux";

export function runBuildFlatpakBundle(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const useExistingRepo = argv.includes("--use-existing-repo");
  const scope = resolveFlatpakScope(process.env);

  requireCommands(["flatpak", "flatpak-builder", "npm", "node", "realpath", "stat"]);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const version = packageJson.version;
  const distDir = path.join(rootDir, "dist");

  const flatpakArchResult = spawnSync("flatpak", ["--default-arch"], {
    encoding: "utf8",
  });
  const flatpakArch = flatpakArchResult.stdout.trim();
  const bundlePath = path.join(
    distDir,
    `canva-linux-${version}-${flatpakArch}.flatpak`,
  );

  info(`Generating Flatpak bundle for version ${version} (${flatpakArch})`);
  runCommand("npm", ["run", "build:metadata:effective"], { cwd: rootDir, dryRun });

  if (useExistingRepo) {
    if (!repoHasAppRef(rootDir)) {
      throw new Error("repo/ is missing or does not contain io.github.coletivo420.canva-linux refs");
    }
    info("Using existing repo/ directory by explicit request");
  } else {
    printFlatpakBundleNotice();
    ensureFlathubRuntime(scope, { dryRun, rootDir });
    info("Building Electron app (target: dir)");
    runCommand("npm", ["run", "dist"], { cwd: rootDir, dryRun });
    ensureLinuxUnpacked(rootDir, { dryRun });
    buildFlatpakRepo(rootDir, scope, { dryRun });
  }

  if (!dryRun) {
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);

    const result = spawnSync(
      "flatpak",
      [
        "build-bundle",
        "repo",
        bundlePath,
        APP_ID,
        `--arch=${flatpakArch}`,
        "--runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo",
      ],
      { cwd: rootDir, stdio: "inherit" },
    );

    if (result.status !== 0) {
      throw new Error(`flatpak build-bundle failed with status ${result.status}`);
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
    const tmpMetadata = path.join(os.tmpdir(), `flatpak-metadata-${Date.now()}.json`);
    if (extractFlatpakRepoBuildMetadata(rootDir, tmpMetadata)) {
      fs.copyFileSync(tmpMetadata, `${bundlePath}.build-metadata.json`);
      ok(`Flatpak bundle metadata generated from reused repo: ${bundlePath}.build-metadata.json`);
    } else {
      warn("Could not read build metadata from reused repo; Flatpak bundle sidecar was not generated.");
    }
    if (fs.existsSync(tmpMetadata)) fs.unlinkSync(tmpMetadata);
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
    if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
    fs.symlinkSync(unpackedDir, linkPath);
  }

  ok(`Electron build output ready: dist/${unpackedDir}`);
}

function extractFlatpakRepoBuildMetadata(rootDir: string, outputPath: string): boolean {
  try {
    const refs = spawnSync("ostree", ["--repo=repo", "refs"], {
      cwd: rootDir,
      encoding: "utf8",
    });
    const flatpakArch = spawnSync("flatpak", ["--default-arch"], {
      encoding: "utf8",
    }).stdout.trim();
    const ref = refs.stdout
      .split("\n")
      .filter((line) => line.startsWith(`app/${APP_ID}/${flatpakArch}/`))
      .sort()
      .pop();

    if (!ref) return false;

    const content = spawnSync(
      "ostree",
      ["--repo=repo", "cat", ref, "/files/share/canva-linux/version"],
      { cwd: rootDir },
    );
    if (content.status === 0 && content.stdout.length > 0) {
      fs.writeFileSync(outputPath, content.stdout);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}
