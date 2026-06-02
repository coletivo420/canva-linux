import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../../project-root.js";

const expectedMain = ".build/electron/main/index.mjs";

function requireFile(rootDir: string, file: string, failures: string[]) {
  if (!fs.existsSync(path.join(rootDir, file))) {
    failures.push(`missing file: ${file}`);
  }
}

function requireDir(rootDir: string, dir: string, failures: string[]) {
  if (!fs.existsSync(path.join(rootDir, dir))) {
    failures.push(`missing directory: ${dir}`);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const failures: string[] = [];

  if (pkg.main !== expectedMain) {
    failures.push(
      `package.json main must be ${expectedMain}, got: ${pkg.main}`,
    );
  }

  if (pkg.build?.extraMetadata?.main !== expectedMain) {
    failures.push(
      "build.extraMetadata.main must match compiled runtime entrypoint",
    );
  }

  const filesToRequire = [
    ".build/electron/main/index.mjs",
    ".build/electron/preload/canva.bundle.mjs",
    ".build/electron/preload/toolbar.bundle.mjs",
    ".build/electron/ui/toolbar.html",
  ];

  for (const f of filesToRequire) requireFile(rootDir, f, failures);
  requireDir(rootDir, ".build/electron/assets", failures);

  const preloadBundlePath = path.join(
    rootDir,
    ".build/electron/preload/canva.bundle.mjs",
  );
  if (
    fs.existsSync(preloadBundlePath) &&
    fs.statSync(preloadBundlePath).size === 0
  ) {
    failures.push("preload bundle is empty");
  }

  for (const staleOutput of [
    ".build/electron/main/index.js",
    ".build/electron/preload/canva.bundle.js",
    ".build/electron/preload/toolbar.js",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, staleOutput))) {
      failures.push(`${staleOutput}: stale CommonJS-era runtime output must not exist`);
    }
  }

  const compiledMainPath = path.join(rootDir, ".build/electron/main/index.mjs");
  if (fs.existsSync(compiledMainPath)) {
    const compiledMain = fs.readFileSync(compiledMainPath, "utf8");
    const legacyPackageLookupPattern = "requ" + "ire('../../package.json')";
    if (compiledMain.includes(legacyPackageLookupPattern)) {
      failures.push(
        "compiled main must not require ../../package.json from .build/",
      );
    }
  }

  if (failures.length) {
    console.error("[runtime-build-check] FAILED:");
    for (const f of failures) console.error(`- ${f}`);
    return 1;
  }

  console.log("[runtime-build-check] OK");
  return 0;
}

if (/check-runtime-build\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[runtime-build-check] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
