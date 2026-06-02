import { spawnSync } from "node:child_process";
import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../../canva-linux/project-root.js";

const repoRoot = findProjectRoot(
  process.env.CANVA_SCRIPT_REPO_ROOT ||
    (process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd()),
);

type CommandArgs = readonly string[];

function run(label: string, command: string, args: CommandArgs): void {
  console.log(`[runtime-build] ${label}`);

  const result = spawnSync(command, [...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

export function main(): void {
  const buildDir = path.join(repoRoot, ".build");
  console.log("[runtime-build] clean .build");
  fs.rmSync(buildDir, { recursive: true, force: true });
  run("rebuild script artifacts after clean", "npm", ["run", "build:scripts"]);
  run("generate effective build metadata", "npm", ["run", "build:metadata:effective"]);
  run("build electron-builder beforeBuild hook", "npm", [
    "run",
    "bootstrap:electron-builder",
  ]);
  console.log("[runtime-build] compile electron runtime");
  esbuild.buildSync({
    absWorkingDir: repoRoot,
    bundle: true,
    entryPoints: ["build-resources/electron/main/index.ts"],
    external: ["electron"],
    format: "esm",
    outfile: ".build/electron/main/index.mjs",
    platform: "node",
    target: "node22",
  });
  run("copy runtime assets", process.execPath, [
    ".build/scripts/copy-runtime-assets.mjs",
  ]);
  run("build preload bundle in .build", process.execPath, [
    ".build/scripts/build-preload-bundle.mjs",
    "--build-output",
  ]);

  const requiredFiles = [
    ".build/electron/main/index.mjs",
    ".build/electron/preload/canva.bundle.mjs",
    ".build/electron/ui/toolbar.html",
    ".build/electron/assets",
  ];

  for (const file of requiredFiles) {
    const absolute = path.join(repoRoot, file);
    if (!fs.existsSync(absolute)) {
      console.error(`[runtime-build] missing required build artifact: ${file}`);
      process.exit(1);
    }
  }

  console.log("[runtime-build] OK");
}

if (/build-runtime\.(mjs|js|ts)$/.test(process.argv[1] || "")) main();
