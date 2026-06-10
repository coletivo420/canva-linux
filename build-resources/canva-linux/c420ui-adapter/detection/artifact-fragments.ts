import fs from "node:fs";
import path from "node:path";
import { type CanvaLinuxArtifactFragment } from "../../../c420ui/src/detection.js";

type PackageJson = { version?: string };

type ArtifactWorkflowConfig = {
  id?: unknown;
  kind?: unknown;
  label?: unknown;
  planned?: unknown;
  outputPattern?: unknown;
};

type ArtifactsConfig = { workflows?: unknown };

type ArtifactMetadata = {
  version?: string;
  baseVersion?: string;
  basePhase?: string;
  fullVersion?: string;
  canvaLinuxSourceHash?: string;
};

type NormalizedArtifactMetadata = Pick<
  CanvaLinuxArtifactFragment,
  "version" | "fullVersion" | "hash" | "hashKind"
> & {
  metadataFound?: boolean;
};

const ARTIFACTS_CONFIG_PATH = "build-resources/canva-linux/config/artifacts.json";
const ARTIFACT_PATH_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const SUPPORTED_ARTIFACT_PATTERN_EXAMPLES = [
  "*.AppImage",
  "*.flatpak",
  "linux-unpacked",
  "*.tar.gz",
  "SHA256SUMS",
  ".deb",
  ".rpm",
  "PKGBUILD",
  "*.pkg.tar.*",
] as const;

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readPackageVersion(rootDir: string): string {
  return readJsonFile<PackageJson>(path.join(rootDir, "package.json")).version ?? "unknown";
}

function loadArtifactWorkflows(rootDir: string): ArtifactWorkflowConfig[] {
  const configPath = path.join(rootDir, ARTIFACTS_CONFIG_PATH);
  if (!fs.existsSync(configPath)) return [];
  const config = readJsonFile<ArtifactsConfig>(configPath);
  return Array.isArray(config.workflows) ? (config.workflows as ArtifactWorkflowConfig[]) : [];
}

function normalizeConfigPath(configPath: string): string {
  return configPath.split(/[\\/]+/).filter(Boolean).join(path.sep);
}

function resolveOutputPattern(outputPattern: string, version: string): string {
  return normalizeConfigPath(outputPattern.replaceAll("${version}", version));
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function patternToRegExp(pattern: string): RegExp {
  const normalized = normalizeConfigPath(pattern);
  const source = normalized
    .split("*")
    .map(escapeRegExp)
    .join("[^\\/]*");
  return new RegExp(`^${source}$`);
}

function artifactKind(id: string, kind: string): string {
  if (id === "linux-unpacked" || id.includes("linux-unpacked")) return "linux-unpacked";
  if (id === "release-checksums") return "sha256sums";
  return kind;
}

function candidatePathsForPattern(rootDir: string, outputPattern: string): string[] {
  const resolvedPattern = normalizeConfigPath(outputPattern);
  if (!resolvedPattern.includes("*")) {
    const absolutePath = path.join(rootDir, resolvedPattern);
    return fs.existsSync(absolutePath) ? [absolutePath] : [];
  }

  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = path.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = path.join(rootDir, scanRootRelative || ".");
  if (!fs.existsSync(scanRoot)) return [];

  const matcher = patternToRegExp(resolvedPattern);
  const candidates: string[] = [];

  for (const entry of fs.readdirSync(scanRoot, { withFileTypes: true })) {
    const absolutePath = path.join(scanRoot, entry.name);
    const relativePath = normalizeConfigPath(path.relative(rootDir, absolutePath));
    if (matcher.test(relativePath)) candidates.push(absolutePath);
  }

  return candidates.sort(ARTIFACT_PATH_COLLATOR.compare);
}

function readMetadataJson(filePath: string): ArtifactMetadata | undefined {
  try {
    const raw = readJsonFile<ArtifactMetadata>(filePath);
    return raw && typeof raw === "object" ? raw : undefined;
  } catch {
    return undefined;
  }
}

function firstMetadataVersion(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

function normalizeMetadata(metadata: ArtifactMetadata | undefined): NormalizedArtifactMetadata {
  if (!metadata) return {};
  const version = firstMetadataVersion(
    metadata.baseVersion,
    metadata.basePhase,
    metadata.version,
  );
  const fullVersion = firstMetadataVersion(
    metadata.fullVersion,
    metadata.version,
    metadata.baseVersion,
    metadata.basePhase,
  );
  const hash = metadata.canvaLinuxSourceHash?.trim();
  return {
    metadataFound: true,
    ...(version ? { version } : {}),
    ...(fullVersion ? { fullVersion } : {}),
    hash: hash || "unknown",
    hashKind: "canvaLinuxSourceHash",
  };
}

function readVersionSidecar(filePath: string): NormalizedArtifactMetadata {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}

function readArtifactPackageJsonVersion(artifactPath: string): NormalizedArtifactMetadata {
  const packageJsonPath = path.join(artifactPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return {};
  const version = readJsonFile<PackageJson>(packageJsonPath).version?.trim();
  return version ? { version, fullVersion: version } : {};
}

function readArtifactMetadata(
  rootDir: string,
  artifactPath: string,
  artifactKindValue: string,
): NormalizedArtifactMetadata {
  const sidecars = [
    `${artifactPath}.build-metadata.json`,
    `${artifactPath}.version.json`,
    `${artifactPath}.version`,
  ];

  for (const sidecar of sidecars) {
    if (!fs.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }

  if (fs.existsSync(artifactPath) && fs.statSync(artifactPath).isDirectory()) {
    const markers = [
      path.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      path.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...(artifactKindValue === "linux-unpacked"
        ? [
            path.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json"),
            path.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json"),
          ]
        : []),
    ];
    for (const marker of markers) {
      if (fs.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
    }
    return readArtifactPackageJsonVersion(artifactPath);
  }

  return {};
}

function inferVersionFromFilename(artifactPath: string, packageVersion: string): string | undefined {
  const name = path.basename(artifactPath);
  if (name.includes(packageVersion)) return packageVersion;
  const match = name.match(/^canva-linux-([0-9][^-]*(?:[-+.][A-Za-z0-9.]+)*)-/);
  return match?.[1];
}

function toRelativeArtifactPath(rootDir: string, artifactPath: string): string {
  return normalizeConfigPath(path.relative(rootDir, artifactPath));
}

export function buildCanvaLinuxArtifactFragments(rootDir: string): CanvaLinuxArtifactFragment[] {
  void SUPPORTED_ARTIFACT_PATTERN_EXAMPLES;
  const packageVersion = readPackageVersion(rootDir);
  const workflows = loadArtifactWorkflows(rootDir);
  const fragments: CanvaLinuxArtifactFragment[] = [];

  for (const workflow of workflows) {
    if (typeof workflow.id !== "string" || typeof workflow.kind !== "string" || typeof workflow.label !== "string") continue;
    if (typeof workflow.outputPattern !== "string") {
      fragments.push({
        id: workflow.id,
        kind: artifactKind(workflow.id, workflow.kind),
        label: workflow.label,
        detected: false,
      });
      continue;
    }

    const outputPattern = resolveOutputPattern(workflow.outputPattern, packageVersion);
    const candidates = candidatePathsForPattern(rootDir, outputPattern);
    const artifactPath = candidates.at(-1);
    const detected = Boolean(artifactPath);
    const kind = artifactKind(workflow.id, workflow.kind);
    const metadata = artifactPath ? readArtifactMetadata(rootDir, artifactPath, kind) : {};
    const fallbackVersion = artifactPath && kind !== "linux-unpacked" ? inferVersionFromFilename(artifactPath, packageVersion) : undefined;
    const version = metadata.version ?? fallbackVersion;
    const hash = metadata.hash ?? (fallbackVersion ? "unknown" : undefined);

    fragments.push({
      id: workflow.id,
      kind,
      label: workflow.label,
      detected,
      ...(artifactPath ? { path: toRelativeArtifactPath(rootDir, artifactPath) } : {}),
      ...(version ? { version } : {}),
      ...(metadata.fullVersion ? { fullVersion: metadata.fullVersion } : {}),
      ...(hash ? { hash, hashKind: metadata.hashKind ?? "canvaLinuxSourceHash" } : {}),
    });
  }

  return fragments;
}
