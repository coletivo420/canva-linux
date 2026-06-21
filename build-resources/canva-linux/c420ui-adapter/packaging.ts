import fs from "node:fs";
import path from "node:path";
import { loadCanvaLinuxArtifactWorkflows } from "./artifacts.js";

type PackageJson = {
  version?: string;
};

export type CanvaLinuxAppImageArtifactPattern = {
  startsWith: string;
  endsWith: string;
};

function loadPackageVersion(rootDir: string): string {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as PackageJson;
  if (!packageJson.version) {
    throw new Error("package.json version is required for AppImage artifact selection");
  }
  return packageJson.version;
}

export function loadCanvaLinuxAppImageArtifactPattern(
  rootDir: string,
): CanvaLinuxAppImageArtifactPattern {
  const version = loadPackageVersion(rootDir);
  const workflow = loadCanvaLinuxArtifactWorkflows(rootDir, version).find(
    (candidate) => candidate.kind === "appimage" && candidate.outputPattern,
  );
  if (!workflow?.outputPattern) {
    throw new Error("Missing AppImage outputPattern in Canva Linux artifacts config");
  }

  const filePattern = path.basename(workflow.outputPattern);
  const wildcardIndex = filePattern.indexOf("*");
  if (wildcardIndex < 0) {
    return { startsWith: filePattern, endsWith: "" };
  }
  return {
    startsWith: filePattern.slice(0, wildcardIndex),
    endsWith: filePattern.slice(wildcardIndex + 1),
  };
}
