import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

import { findCanvaLinuxProjectRoot as findProjectRoot } from "../../canva-linux/project-root.js";

const repoRoot = findProjectRoot(
  process.env.CANVA_SCRIPT_REPO_ROOT ||
    (process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd()),
);

const outputDir = path.join(
  repoRoot,
  ".build",
  "build-resources",
  "canva-linux",
  "checks",
  "core",
);

const legacyOutputDir = path.join(repoRoot, ".build", "scripts", "core");

const entryPoints = [
  "build-resources/canva-linux/checks/core/check-ai-guardrails.ts",
  "build-resources/canva-linux/checks/core/check-doc-links.ts",
  "build-resources/canva-linux/checks/core/check-dependency-policy.ts",
  "build-resources/canva-linux/checks/core/check-runtime-build.ts",
  "build-resources/canva-linux/checks/core/check-repository-policy.ts",
] as const;

export async function main(): Promise<void> {
  fs.rmSync(legacyOutputDir, { recursive: true, force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });

  await esbuild.build({
    absWorkingDir: repoRoot,
    bundle: true,
    entryPoints: [...entryPoints],
    format: "esm",
    outExtension: { ".js": ".mjs" },
    outdir: outputDir,
    platform: "node",
  });
}

if (/build-scripts-core\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
