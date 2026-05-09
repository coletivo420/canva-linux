import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../canva-linux/project-root";

const expectedMain = ".build/electron/main/index.js";

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
    ".build/electron/main/index.js",
    ".build/electron/main/logging-normalize.js",
    ".build/electron/main/logging.js",
    ".build/electron/main/logging-helpers.js",
    ".build/electron/main/gpu-diagnostics.js",
    ".build/electron/main/runtime.js",
    ".build/electron/main/ipc.js",
    ".build/electron/main/lifecycle.js",
    ".build/electron/main/eyedropper-bridge.js",
    ".build/electron/main/shell.js",
    ".build/electron/main/oauth.js",
    ".build/electron/main/tabs.js",
    ".build/electron/main/tab-controller.js",
    ".build/electron/main/tab-events.js",
    ".build/electron/main/window-open-policy.js",
    ".build/electron/shared/debug.js",
    ".build/electron/shared/navigation.js",
    ".build/electron/preload/debug.js",
    ".build/electron/preload/upload-diagnostics.js",
    ".build/electron/preload/browser-capture-diagnostics.js",
    ".build/electron/preload/eyedropper-routing-diagnostics.js",
    ".build/electron/preload/custom-eyedropper-flow.js",
    ".build/electron/preload/native-eyedropper-wrapper.js",
    ".build/electron/preload/canva.js",
    ".build/electron/preload/cl-eyedropper/index.js",
    ".build/electron/preload/cl-eyedropper/cl-eyedropper.js",
    ".build/electron/preload/canva.bundle.js",
    ".build/electron/ui/toolbar.html",
  ];

  for (const f of filesToRequire) requireFile(rootDir, f, failures);
  requireDir(rootDir, ".build/electron/assets", failures);

  const preloadBundlePath = path.join(
    rootDir,
    ".build/electron/preload/canva.bundle.js",
  );
  if (
    fs.existsSync(preloadBundlePath) &&
    fs.statSync(preloadBundlePath).size === 0
  ) {
    failures.push("preload bundle is empty");
  }

  const compiledMainPath = path.join(rootDir, ".build/electron/main/index.js");
  if (fs.existsSync(compiledMainPath)) {
    const compiledMain = fs.readFileSync(compiledMainPath, "utf8");
    if (compiledMain.includes("require('../../package.json')")) {
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

if (
  require.main === module &&
  /check-runtime-build\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[runtime-build-check] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
