import fs from "node:fs";
import path from "node:path";
import type { C420UIProjectOperationsAdapter } from "../../build-resources/c420ui/operations/project-adapter";

type PackageJson = { version?: string; productName?: string; build?: { appId?: string } };

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function createCanvaLinuxOperationsAdapter(
  rootDir: string,
): C420UIProjectOperationsAdapter {
  const packageJson = readJsonFile<PackageJson>(path.join(rootDir, "package.json")) ?? {};
  return {
    projectRoot: rootDir,
    appId: packageJson.build?.appId ?? "io.github.coletivo420.canva-linux",
    productName: packageJson.productName ?? "Canva Linux",
    packageVersion: packageJson.version ?? "0.0.0",
    desktopFilePath: "build-resources/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop",
    metainfoPath: "build-resources/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    iconSourceDir: "build-resources/canva-linux-assets/icons",
    flatpakManifestPath: "io.github.coletivo420.canva-linux.yml",
    flathubManifestPath: "build-resources/canva-linux/packaging/flathub/manifest.yml",
    buildMetadataPath: "build-resources/canva-linux/config/build-metadata.json",
  };
}
