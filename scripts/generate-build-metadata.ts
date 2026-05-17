import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createBuildMetadata } from "../electron/main/build-metadata";

type PackageJson = { version?: string };
type ProjectUiJson = { displayVersion?: string; phase?: string };

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function readJson<T>(rootDir: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as T;
}

function resolveBuildRevision(rootDir: string): string {
  for (const key of [
    "CANVA_LINUX_BUILD_REVISION",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "SOURCE_COMMIT",
  ] as const) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  try {
    const value = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value || "unknown";
  } catch {
    return "unknown";
  }
}

export function main(): void {
  const rootDir = findProjectRoot();
  const packageJson = readJson<PackageJson>(rootDir, "package.json");
  const projectUi = readJson<ProjectUiJson>(rootDir, "config/canva-linux/project-ui.json");

  if (!packageJson.version) throw new Error("package.json: missing version");
  if (!projectUi.displayVersion) throw new Error("project-ui.json: missing displayVersion");
  if (!projectUi.phase) throw new Error("project-ui.json: missing phase");

  const metadata = createBuildMetadata({
    baseVersion: packageJson.version,
    baseDisplayVersion: projectUi.displayVersion,
    basePhase: projectUi.phase,
    buildRevision: resolveBuildRevision(rootDir),
  });
  const outputPath = path.join(rootDir, "config", "canva-linux", "build-metadata.json");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(`[build-metadata] wrote ${path.relative(rootDir, outputPath)}`);
}

if (require.main === module) main();
