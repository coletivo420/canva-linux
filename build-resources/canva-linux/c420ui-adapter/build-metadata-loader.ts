import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as buildMetadataModule from "../../electron/main/build-metadata.js";

type PackageJson = { version?: string };
type ProjectUiJson = { displayVersion?: string; phase?: string };
type CanvaLinuxBuildMetadataModule = typeof import("../../electron/main/build-metadata.js");
type CanvaLinuxBuildMetadata = ReturnType<CanvaLinuxBuildMetadataModule["createBuildMetadata"]>;

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
  metadataModule: CanvaLinuxBuildMetadataModule,
): CanvaLinuxBuildMetadata | null {
  const packageJson = readJsonFile<PackageJson>(path.join(rootDir, "package.json"));
  const projectUi = readJsonFile<ProjectUiJson>(
    path.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json"),
  );
  if (!packageJson?.version || !projectUi?.displayVersion || !projectUi?.phase) {
    return null;
  }

  return metadataModule.createBuildMetadata({
    baseVersion: packageJson.version,
    baseDisplayVersion: projectUi.displayVersion,
    basePhase: projectUi.phase,
    buildRevision,
  });
}

function loadPackagedMetadata(
  rootDir: string,
  metadataModule: CanvaLinuxBuildMetadataModule,
): CanvaLinuxBuildMetadata | null {
  const metadata = readJsonFile<Partial<CanvaLinuxBuildMetadata>>(
    path.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json"),
    
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}

function loadEffectiveFileMetadata(
  rootDir: string,
  metadataModule: CanvaLinuxBuildMetadataModule,
): CanvaLinuxBuildMetadata | null {
  const metadata = readJsonFile<Partial<CanvaLinuxBuildMetadata>>(
    path.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json"),
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}

export function fallbackEffectiveBuildMetadata(
  rootDir: string = process.cwd(),
  metadataModule?: CanvaLinuxBuildMetadataModule,
): CanvaLinuxBuildMetadata {
  const module = metadataModule ?? buildMetadataModule;

  return module.createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION,
    baseDisplayVersion: UNKNOWN_BASE_VERSION,
    basePhase: UNKNOWN_BASE_VERSION,
    buildRevision: UNKNOWN_BUILD_REVISION,
  });
}

export function loadEffectiveBuildMetadata(rootDir: string): CanvaLinuxBuildMetadata {
  const resolvedRootDir = path.resolve(rootDir);
  const metadataModule = buildMetadataModule;

  const effective = loadEffectiveFileMetadata(resolvedRootDir, metadataModule);
  if (effective) return effective;

  const envRevision = resolveEnvBuildRevision();
  if (envRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, envRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }

  const gitRevision = resolveGitBuildRevision(resolvedRootDir);
  if (gitRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, gitRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }

  return loadPackagedMetadata(resolvedRootDir, metadataModule) ?? fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
}

export function loadCommittedBuildMetadata(rootDir: string): CanvaLinuxBuildMetadata {
  const resolvedRootDir = path.resolve(rootDir);
  const metadataModule = buildMetadataModule;

  return loadPackagedMetadata(resolvedRootDir, metadataModule) ?? fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
}
