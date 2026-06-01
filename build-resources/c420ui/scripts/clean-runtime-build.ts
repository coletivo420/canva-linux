import fs from "node:fs";
import path from "node:path";

const repoRoot =
  process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
const buildDir = path.join(repoRoot, ".build");

export function main(): void {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log("[runtime-build] removed .build");
}

if (/clean-runtime-build\.(mjs|js|ts)$/.test(process.argv[1] || "")) main();
