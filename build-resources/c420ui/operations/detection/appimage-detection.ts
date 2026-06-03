import fs from "node:fs";
import path from "node:path";
import {
  readBuildMetadataBaseVersion,
  readBuildMetadataFullVersion,
} from "./version-marker.js";

export function detectAppImageArtifacts(rootDir: string): boolean {
  const distDir = path.join(rootDir, "dist");
  if (!fs.existsSync(distDir)) return false;

  try {
    const files = fs.readdirSync(distDir);
    return files.some((file) => file.endsWith(".AppImage"));
  } catch {
    return false;
  }
}

export function findLatestAppImageArtifact(rootDir: string): string {
  const distDir = path.join(rootDir, "dist");
  if (!fs.existsSync(distDir)) return "";

  try {
    const files = fs.readdirSync(distDir)
      .filter((file) => file.endsWith(".AppImage"))
      .sort();
    const latest = files[files.length - 1];
    return latest ? path.join("dist", latest) : "";
  } catch {
    return "";
  }
}

export function findArtifactBuildMetadataMarker(
  artifactPath: string,
  rootDir: string,
): string {
  if (!artifactPath) return "";

  const absoluteArtifactPath = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.join(rootDir, artifactPath);

  const markers = [
    `${absoluteArtifactPath}.build-metadata.json`,
    `${absoluteArtifactPath}.version.json`,
    `${absoluteArtifactPath}.version`,
  ];

  for (const marker of markers) {
    if (fs.existsSync(marker)) return marker;
  }
  return "";
}

export function detectAppImageVersion(rootDir: string): string {
  const file = findLatestAppImageArtifact(rootDir);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir);

  let version = readBuildMetadataBaseVersion(metadata);
  if (version) return version;

  // Search in dist resources
  const findMetadataInDist = (dir: string, depth: number): string => {
    if (depth > 8) return "";
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (
          entry.isFile() &&
          fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")
        ) {
          return fullPath;
        }
      }
    } catch {
      // Ignore
    }
    return "";
  };

  const distDir = path.join(rootDir, "dist");
  if (fs.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataBaseVersion(distMetadata);
    if (version) return version;
  }

  if (!file) return "";
  const name = path.basename(file);
  const match = name.match(
    /^canva-linux-([0-9]+\.[0-9]+\.[0-9]+[-+.a-zA-Z0-9]*)-[^-]+\.AppImage$/,
  );
  return match?.[1] ?? "";
}

export function detectAppImageFullVersion(rootDir: string): string {
  const file = findLatestAppImageArtifact(rootDir);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir);

  let version = readBuildMetadataFullVersion(metadata);
  if (version) return version;

  // Search in dist resources
  const findMetadataInDist = (dir: string, depth: number): string => {
    if (depth > 8) return "";
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (
          entry.isFile() &&
          fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")
        ) {
          return fullPath;
        }
      }
    } catch {
      // Ignore
    }
    return "";
  };

  const distDir = path.join(rootDir, "dist");
  if (fs.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataFullVersion(distMetadata);
    if (version) return version;
  }

  return detectAppImageVersion(rootDir);
}
