import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT_LAUNCH_GUARD_MESSAGE } from "./tui/settings";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
process.chdir(rootDir);

const outFile = path.join(rootDir, ".build/scripts/tui/index.js");
const tuiDir = path.join(rootDir, "scripts/tui");
const identityFile = path.join(rootDir, "scripts/app-identity-common.sh");

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
    ...listTsFiles(tuiDir),
    path.join(rootDir, "package.json"),
    path.join(rootDir, "package-lock.json"),
  ].filter((file) => fs.existsSync(file));
  return inputs.some((file) => fs.statSync(file).mtimeMs > outMtime);
}

function readProjectPhaseFromShell(): string {
  try {
    const content = fs.readFileSync(identityFile, "utf8");
    const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

function resolveProjectPhase(): string {
  const fromEnv = process.env.CANVA_PROJECT_PHASE?.trim();
  if (fromEnv) return fromEnv;
  return readProjectPhaseFromShell();
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
    console.error(ROOT_LAUNCH_GUARD_MESSAGE);
    process.exit(1);
  }

  ensureNpmDependencies();

  if (needsBuild()) {
    const result = spawnSync("npm", ["run", "build:tui"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  }

  const run = spawnSync(
    process.execPath,
    [".build/scripts/tui/index.js", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, CANVA_PROJECT_PHASE: resolveProjectPhase() },
    },
  );

  process.exit(run.status ?? 0);
}

if (require.main === module) main();
