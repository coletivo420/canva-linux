import fs from "node:fs";

export function readVersionFile(versionFile: string): string {
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, "utf8").trim();
  }
  return "";
}

export function readPackageJsonVersion(packageFile: string): string {
  if (!fs.existsSync(packageFile)) return "";
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    return pkg.version || "";
  } catch {
    return "";
  }
}

export function readBuildMetadataFullVersion(metadataFile: string): string {
  if (!fs.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    return m.fullVersion || m.version || "";
  } catch {
    return "";
  }
}

export function readBuildMetadataBaseVersion(metadataFile: string): string {
  if (!fs.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    return m.baseVersion || m.basePhase || m.version || "";
  } catch {
    return "";
  }
}
