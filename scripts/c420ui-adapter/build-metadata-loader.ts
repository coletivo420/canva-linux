import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type CanvaLinuxBuildMetadata = {
  baseVersion: string;
  baseDisplayVersion: string;
  basePhase: string;
  buildRevision: string;
  version: string;
  displayVersion: string;
  phase: string;
  fullVersion: string;
};

function normalizeBuildRevision(input: string | null | undefined): string {
  if (!input) return "unknown";
  const trimmed = input.trim();
  if (!trimmed || trimmed === "unknown") return "unknown";
  return `g${trimmed.replace(/^g/i, "").slice(0, 7)}`;
}

function appendBuildRevision(base: string, buildRevision: string): string {
  return buildRevision && buildRevision !== "unknown" ? `${base}+${buildRevision}` : base;
}

function createBuildMetadata(input: {
  baseVersion: string;
  baseDisplayVersion: string;
  basePhase: string;
  buildRevision: string;
}): CanvaLinuxBuildMetadata {
  const buildRevision = normalizeBuildRevision(input.buildRevision);
  return {
    baseVersion: input.baseVersion,
    baseDisplayVersion: input.baseDisplayVersion,
    basePhase: input.basePhase,
    buildRevision,
    version: appendBuildRevision(input.baseVersion, buildRevision),
    displayVersion: appendBuildRevision(input.baseDisplayVersion, buildRevision),
    phase: appendBuildRevision(input.basePhase, buildRevision),
    fullVersion: appendBuildRevision(input.basePhase, buildRevision),
  };
}

function normalizeLoadedBuildMetadata(
  metadata: Partial<CanvaLinuxBuildMetadata>,
): CanvaLinuxBuildMetadata | null {
  if (!metadata.baseVersion || !metadata.baseDisplayVersion || !metadata.basePhase) return null;
  return createBuildMetadata({
    baseVersion: metadata.baseVersion,
    baseDisplayVersion: metadata.baseDisplayVersion,
    basePhase: metadata.basePhase,
    buildRevision: metadata.buildRevision || UNKNOWN_BUILD_REVISION,
  });
}

type PackageJson = { version?: string };
type ProjectUiJson = { displayVersion?: string; phase?: string };

const UNKNOWN_BASE_VERSION = "0.0.0";
const UNKNOWN_BUILD_REVISION = "unknown";

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function hasGitRepository(rootDir: string): boolean {
  return fs.existsSync(path.join(rootDir, ".git"));
}

function resolveEnvBuildRevision(): string | null {
  for (const key of [
    "CANVA_LINUX_BUILD_REVISION",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "SOURCE_COMMIT",
  ] as const) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function resolveGitBuildRevision(rootDir: string): string | null {
  if (!hasGitRepository(rootDir)) return null;

  try {
    const value = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}

function createSourceMetadata(
  rootDir: string,
  buildRevision: string,
): CanvaLinuxBuildMetadata | null {
  const packageJson = readJsonFile<PackageJson>(path.join(rootDir, "package.json"));
  const projectUi = readJsonFile<ProjectUiJson>(
    path.join(rootDir, "config", "canva-linux", "project-ui.json"),
  );
  if (!packageJson?.version || !projectUi?.displayVersion || !projectUi?.phase) {
    return null;
  }

  return createBuildMetadata({
    baseVersion: packageJson.version,
    baseDisplayVersion: projectUi.displayVersion,
    basePhase: projectUi.phase,
    buildRevision,
  });
}

function loadPackagedMetadata(rootDir: string): CanvaLinuxBuildMetadata | null {
  const metadata = readJsonFile<Partial<CanvaLinuxBuildMetadata>>(
    path.join(rootDir, "config", "canva-linux", "build-metadata.json"),
  );
  if (!metadata) return null;
  return normalizeLoadedBuildMetadata(metadata);
}

export function fallbackEffectiveBuildMetadata(): CanvaLinuxBuildMetadata {
  return createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION,
    baseDisplayVersion: UNKNOWN_BASE_VERSION,
    basePhase: UNKNOWN_BASE_VERSION,
    buildRevision: UNKNOWN_BUILD_REVISION,
  });
}

export function loadEffectiveBuildMetadata(rootDir: string): CanvaLinuxBuildMetadata {
  const resolvedRootDir = path.resolve(rootDir);
  const envRevision = resolveEnvBuildRevision();
  if (envRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, envRevision);
    if (sourceMetadata) return sourceMetadata;
  }

  const gitRevision = resolveGitBuildRevision(resolvedRootDir);
  if (gitRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, gitRevision);
    if (sourceMetadata) return sourceMetadata;
  }

  return loadPackagedMetadata(resolvedRootDir) ?? fallbackEffectiveBuildMetadata();
}
