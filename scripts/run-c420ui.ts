import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runCanvaLinuxC420UI } from "./c420ui-canva-linux/run";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
process.chdir(rootDir);

function ensureNpmDependencies(): void {
  const script = path.join(rootDir, "scripts/ensure-npm-dependencies.sh");
  if (!fs.existsSync(script)) {
    console.error(`[error] Missing dependency bootstrap script: ${script}`);
    process.exit(1);
  }
  const result = spawnSync("bash", [script], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function main(): void {
  const argv = process.argv.slice(2);

  if (!argv.includes("--help")) {
    ensureNpmDependencies();
  }

  runCanvaLinuxC420UI({
    rootDir,
    argv,
    env: process.env,
  });
}

if (require.main === module) main();
