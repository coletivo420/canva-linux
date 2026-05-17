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

function fallbackBaseMetadata(): CanvaLinuxBuildMetadata {
  const packageJson =
    readJsonFile<PackageJson>(path.join(process.cwd(), "package.json")) ?? {};
  const projectUi =
    readJsonFile<ProjectUiJson>(
      path.join(process.cwd(), "config", "canva-linux", "project-ui.json"),
    ) ?? {};
  const baseVersion = packageJson.version || "0.1.4-15.Dev.7";
  const baseDisplayVersion = projectUi.displayVersion || "0.1.4-15.Dev";
  const basePhase = projectUi.phase || baseVersion;

  return createBuildMetadata({
    baseVersion,
    baseDisplayVersion,
    basePhase,
    buildRevision: "unknown",
  });
}

export function loadCanvaLinuxBuildMetadata(): CanvaLinuxBuildMetadata {
  for (const filePath of candidateMetadataPaths()) {
    const metadata = readJsonFile<CanvaLinuxBuildMetadata>(filePath);
    if (metadata) return createBuildMetadata(metadata);
  }

  return fallbackBaseMetadata();
}

export function formatCanvaLinuxVersion(metadata: CanvaLinuxBuildMetadata): string {
  return `Canva Linux ${metadata.version}`;
}
