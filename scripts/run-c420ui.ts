import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvaLinuxC420UIAdapter } from "./c420ui-canva-linux/adapter";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
process.chdir(rootDir);

const outFile = path.join(rootDir, ".build/scripts/c420ui/index.js");
const uiDir = path.join(rootDir, "scripts/c420ui");
const adapterDir = path.join(rootDir, "scripts/c420ui-canva-linux");
const adapter = createCanvaLinuxC420UIAdapter(rootDir);

function listTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.isFile() && full.endsWith(".ts") ? [full] : [];
  });
}

function needsBuild(): boolean {
  if (!fs.existsSync(outFile)) return true;
  const outMtime = fs.statSync(outFile).mtimeMs;
  const inputs = [
    ...listTsFiles(uiDir),
    ...listTsFiles(adapterDir),
    path.join(rootDir, "package.json"),
    path.join(rootDir, "package-lock.json"),
    path.join(rootDir, "scripts/project-ui.json"),
    path.join(rootDir, "scripts/app-identity-common.sh"),
    path.join(rootDir, "scripts/actions.json"),
  ].filter((file) => fs.existsSync(file));
  return inputs.some((file) => fs.statSync(file).mtimeMs > outMtime);
}

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
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    console.error(adapter.rootLaunchGuardMessage());
    process.exit(1);
  }

  ensureNpmDependencies();

  if (needsBuild()) {
    const result = spawnSync("npm", ["run", "build:c420ui"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }

  const run = spawnSync(
    process.execPath,
    [".build/scripts/c420ui/index.js", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, CANVA_PROJECT_PHASE: adapter.getProjectPhase() },
    },
  );

  process.exit(run.status ?? 0);
}

if (require.main === module) main();
