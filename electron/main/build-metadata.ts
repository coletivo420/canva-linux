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

type PackageJson = { version?: string };
type ProjectUiJson = { displayVersion?: string; phase?: string };

const UNKNOWN_BASE_VERSION = "0.0.0";
const UNKNOWN_DISPLAY_VERSION = "0.0.0";
const UNKNOWN_BUILD_REVISION = "unknown";

export function normalizeBuildRevision(input: string | null | undefined): string {
  if (!input) return "unknown";

  const trimmed = input.trim();
  if (!trimmed || trimmed === "unknown") return "unknown";

  const withoutPrefix = trimmed.replace(/^g/i, "");
  const shortHash = withoutPrefix.slice(0, 7);

  return `g${shortHash}`;
}

export function appendBuildRevision(base: string, buildRevision: string): string {
  return buildRevision && buildRevision !== "unknown"
    ? `${base}+${buildRevision}`
    : base;
}

export function createBuildMetadata(input: {
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

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function candidateMetadataPaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "config", "canva-linux", "build-metadata.json"),
    path.join(__dirname, "..", "..", "config", "canva-linux", "build-metadata.json"),
    path.join(__dirname, "..", "config", "canva-linux", "build-metadata.json"),
  ];
}

export function fallbackBaseMetadata(): CanvaLinuxBuildMetadata {
  const packageJson =
    readJsonFile<PackageJson>(path.join(process.cwd(), "package.json")) ?? {};
  const projectUi =
    readJsonFile<ProjectUiJson>(
      path.join(process.cwd(), "config", "canva-linux", "project-ui.json"),
    ) ?? {};
  const baseVersion = packageJson.version || UNKNOWN_BASE_VERSION;
  const baseDisplayVersion = projectUi.displayVersion || UNKNOWN_DISPLAY_VERSION;
  const basePhase = projectUi.phase || baseVersion;

  return createBuildMetadata({
    baseVersion,
    baseDisplayVersion,
    basePhase,
    buildRevision: UNKNOWN_BUILD_REVISION,
  });
}

export function normalizeLoadedBuildMetadata(
  metadata: Partial<CanvaLinuxBuildMetadata>,
): CanvaLinuxBuildMetadata | null {
  if (
    !metadata.baseVersion ||
    !metadata.baseDisplayVersion ||
    !metadata.basePhase
  ) {
    return null;
  }

  return createBuildMetadata({
    baseVersion: metadata.baseVersion,
    baseDisplayVersion: metadata.baseDisplayVersion,
    basePhase: metadata.basePhase,
    buildRevision: metadata.buildRevision || UNKNOWN_BUILD_REVISION,
  });
}

export function loadCanvaLinuxBuildMetadata(): CanvaLinuxBuildMetadata {
  for (const filePath of candidateMetadataPaths()) {
    const metadata = readJsonFile<Partial<CanvaLinuxBuildMetadata>>(filePath);
    const normalized = metadata ? normalizeLoadedBuildMetadata(metadata) : null;
    if (normalized) return normalized;
  }

  return fallbackBaseMetadata();
}

export function formatCanvaLinuxVersion(metadata: CanvaLinuxBuildMetadata): string {
  return `Canva Linux ${metadata.version}`;
}
