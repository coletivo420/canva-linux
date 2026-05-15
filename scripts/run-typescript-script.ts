import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromHere = createRequire(__filename);
const esbuild = requireFromHere("esbuild") as typeof import("esbuild");

function findProjectRoot(): string {
  const candidates = [
    process.env.CANVA_SCRIPT_REPO_ROOT,
    path.resolve(__dirname, "..", "..", ".."),
    process.cwd(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    let current = path.resolve(candidate);
    while (true) {
      if (
        fs.existsSync(path.join(current, "package.json")) &&
        fs.existsSync(path.join(current, "config/canva-linux/actions.json"))
      ) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  throw new Error(
    "Unable to locate project root from TypeScript runner bootstrap",
  );
}

function usage(): never {
  console.error(
    "usage: node .build/scripts/bootstrap/run-typescript-script.js <entry.ts> [args...]",
  );
  process.exit(64);
}

function resolveEntryPoint(
  rootDir: string,
  rawEntry: string | undefined,
): string {
  if (!rawEntry) usage();

  const entryPoint = path.resolve(rootDir, rawEntry);
  if (!entryPoint.endsWith(".ts")) {
    throw new Error(
      `TypeScript runner entrypoint must end with .ts: ${rawEntry}`,
    );
  }
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`TypeScript runner entrypoint does not exist: ${rawEntry}`);
  }
  return entryPoint;
}

function outputPathForEntry(rootDir: string, entryPoint: string): string {
  const relative = path.relative(rootDir, entryPoint).replace(/\\/g, "/");
  const flatName = relative
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/\.ts$/, ".js");
  return path.join(rootDir, ".build", "scripts", "typescript", flatName);
}

function buildEntry(rootDir: string, entryPoint: string): string {
  const outfile = outputPathForEntry(rootDir, entryPoint);
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  esbuild.buildSync({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    external: ["electron", "blessed", "esbuild", "typescript"],
    sourcemap: false,
    minify: false,
    legalComments: "none",
    logLevel: "warning",
  });

  return outfile;
}

function runBuiltEntry(
  rootDir: string,
  entryPoint: string,
  outfile: string,
  args: string[],
): number {
  const result = spawnSync(process.execPath, [outfile, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      CANVA_SCRIPT_REPO_ROOT: rootDir,
      CANVA_SCRIPT_SOURCE_DIR: path.dirname(entryPoint),
    },
  });

  if (result.error) {
    console.error(
      `[run-typescript-script] failed to start ${path.relative(rootDir, entryPoint)}: ${result.error.message}`,
    );
    return 1;
  }

  if (typeof result.status === "number") return result.status;

  if (result.signal) {
    console.error(
      `[run-typescript-script] ${path.relative(rootDir, entryPoint)} terminated by ${result.signal}`,
    );
    return 1;
  }

  return 1;
}

export function main(): number {
  const rootDir = findProjectRoot();
  const [rawEntry, ...args] = process.argv.slice(2);
  const entryPoint = resolveEntryPoint(rootDir, rawEntry);
  const outfile = buildEntry(rootDir, entryPoint);
  return runBuiltEntry(rootDir, entryPoint, outfile, args);
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[run-typescript-script] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
