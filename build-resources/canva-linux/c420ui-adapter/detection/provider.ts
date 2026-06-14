import fs from "node:fs";
import path from "node:path";
import {
  execFileSync,
} from "node:child_process";
import {
  boolFromC420UIDetectionValue,
  type c420uiOverviewStatus,
  type c420uiOverviewStatusProvider,
  type CanvaLinuxArtifactFragment,
} from "../../../c420ui/src/detection.js";
import { findCanvaLinuxProjectRoot } from "../../project-root.js";
import { buildCanvaLinuxArtifactFragments } from "./artifact-fragments.js";
import { detectInstallations, type InstallationDetectionResult } from "../../../c420ui/operations/detection/install-detection.js";

type CanvaLinuxOverviewStatusProvider = Omit<
  c420uiOverviewStatusProvider,
  "buildOverviewStatus"
> & {
  buildOverviewStatus(rootDir: string): c420uiOverviewStatus;
};

export type ProjectPackageJson = {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
  repository?: { url?: string } | string;
};

let cachedPackageJson:
  | {
      rootDir: string;
      packageJson: ProjectPackageJson;
    }
  | undefined;

export function readPackage(rootDir: string): ProjectPackageJson {
  if (cachedPackageJson?.rootDir === rootDir) {
    return cachedPackageJson.packageJson;
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as ProjectPackageJson;

  cachedPackageJson = {
    rootDir,
    packageJson,
  };

  return packageJson;
}

export function readPackageDependencyVersion(
  rootDir: string,
  name: string,
): string | undefined {
  const packageJson = readPackage(rootDir);

  return (
    packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
  );
}

function normalizeSemverRange(range: string | undefined): string | undefined {
  if (!range) return undefined;
  // Simple normalization: remove ^, ~, >, <, =
  return range.replace(/[\^~><=]/g, "").split(" ")[0];
}

export function readNodeVersion(rootDir: string): string | undefined {
  const packageJson = readPackage(rootDir);

  return (
    normalizeSemverRange(packageJson.engines?.node) ?? process.versions.node
  );
}

export const readNpmVersion = (() => {
  let cached: string | undefined;
  let attempted = false;

  return (): string | undefined => {
    if (attempted) {
      return cached;
    }

    attempted = true;

    try {
      cached = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();

      return cached;
    } catch {
      return undefined;
    }
  };
})();

const emptyInstallations = {
  nativeSystem: false,
  nativeUser: false,
  flatpakSystem: false,
  flatpakUser: false,
  appImageArtifacts: false,

  nativeSystemVersion: "",
  nativeUserVersion: "",
  flatpakSystemVersion: "",
  flatpakUserVersion: "",
  appImageVersion: "",

  nativeSystemFullVersion: "",
  nativeUserFullVersion: "",
  flatpakSystemFullVersion: "",
  flatpakUserFullVersion: "",
  appImageFullVersion: "",

  nativeSystemHash: "",
  nativeUserHash: "",
  flatpakSystemHash: "",
  flatpakUserHash: "",
  appImageHash: "",
};

function readPhase(rootDir: string): string {
  const projectUiPath = path.join(rootDir, "build-resources/canva-linux/config/project-ui.json");
  try {
    if (!fs.existsSync(projectUiPath)) return "unknown";
    const projectUi = JSON.parse(fs.readFileSync(projectUiPath, "utf8")) as {
      phase?: string;
    };
    return projectUi.phase ?? "unknown";
  } catch {
    return "unknown";
  }
}

function safeProjectMetadata(rootDir: string): c420uiOverviewStatus["project"] {
  let version = "unknown";
  let phase = "unknown";

  try {
    version = readPackage(rootDir).version || "unknown";
  } catch {
    version = "unknown";
  }

  try {
    phase = readPhase(rootDir);
  } catch {
    phase = "unknown";
  }

  return {
    version,
    phase,
    appId: "io.github.coletivo420.canva-linux",
    executable: "canva-linux",
    repository: "https://github.com/coletivo420/canva-linux",
  };
}

function buildInstallations(
  values: Record<string, string>,
  artifactFragments: CanvaLinuxArtifactFragment[] = [],
): c420uiOverviewStatus["installations"] {
  const appImageFragment = artifactFragments.find(
    (fragment) => fragment.kind === "appimage" || fragment.id.includes("appimage"),
  );

  return {
    nativeSystem: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_SYSTEM),
    nativeUser: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_USER),
    flatpakSystem: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_SYSTEM),
    flatpakUser: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_USER),
    appImageArtifacts:
      appImageFragment?.detected ??
      boolFromC420UIDetectionValue(values.DETECTED_APPIMAGE_ARTIFACTS),
    nativeSystemVersion: values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserVersion: values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemVersion: values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserVersion: values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageVersion:
      appImageFragment?.version ||
      values.DETECTED_APPIMAGE_VERSION ||
      "",
    // Detected Installations renderers should prefer *FullVersion fields and
    // fall back to the base *Version fields for older detectors/markers.
    nativeSystemFullVersion:
      values.DETECTED_NATIVE_SYSTEM_FULL_VERSION ||
      values.DETECTED_NATIVE_SYSTEM_VERSION ||
      "",
    nativeUserFullVersion:
      values.DETECTED_NATIVE_USER_FULL_VERSION ||
      values.DETECTED_NATIVE_USER_VERSION ||
      "",
    flatpakSystemFullVersion:
      values.DETECTED_FLATPAK_SYSTEM_FULL_VERSION ||
      values.DETECTED_FLATPAK_SYSTEM_VERSION ||
      "",
    flatpakUserFullVersion:
      values.DETECTED_FLATPAK_USER_FULL_VERSION ||
      values.DETECTED_FLATPAK_USER_VERSION ||
      "",
    appImageFullVersion:
      appImageFragment?.fullVersion ||
      appImageFragment?.version ||
      values.DETECTED_APPIMAGE_FULL_VERSION ||
      values.DETECTED_APPIMAGE_VERSION ||
      "",

    nativeSystemHash: values.DETECTED_NATIVE_SYSTEM_HASH || "",
    nativeUserHash: values.DETECTED_NATIVE_USER_HASH || "",
    flatpakSystemHash: values.DETECTED_FLATPAK_SYSTEM_HASH || "",
    flatpakUserHash: values.DETECTED_FLATPAK_USER_HASH || "",
    appImageHash: appImageFragment?.hash || values.DETECTED_APPIMAGE_HASH || "",
    nativeSystemHashKind: "canvaLinuxSourceHash",
    nativeUserHashKind: "canvaLinuxSourceHash",
    flatpakSystemHashKind: "canvaLinuxSourceHash",
    flatpakUserHashKind: "canvaLinuxSourceHash",
    appImageHashKind: "canvaLinuxSourceHash",
  };
}

export type CanvaLinuxDetectionProviderOptions = {
  detectInstallations?: (rootDir: string) => InstallationDetectionResult;
};

export function createCanvaLinuxDetectionProvider(
  options: CanvaLinuxDetectionProviderOptions = {},
): CanvaLinuxOverviewStatusProvider {
  const detect = options.detectInstallations ?? detectInstallations;

  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir: string): c420uiOverviewStatus {
      const project = safeProjectMetadata(rootDir);
      const warnings: string[] = [];
      let values: Record<string, string> = {};

      try {
        const result = detect(rootDir);
        for (const [key, value] of Object.entries(result)) {
          values[key] = String(value);
        }
      } catch (error) {
        warnings.push(
          `Installation detection failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const artifactFragments = buildCanvaLinuxArtifactFragments(rootDir);
      return {
        project,
        runtime: {
          electronVersion: normalizeSemverRange(
            readPackageDependencyVersion(rootDir, "electron"),
          ) ?? "unknown",
          nodeVersion: readNodeVersion(rootDir),
          npmVersion: readNpmVersion() ?? "unknown",
        },
        installations: {
          ...emptyInstallations,
          ...buildInstallations(values, artifactFragments),
        },
        artifactFragments,
        warnings,
      };
    },
  };
}

export function buildCanvaLinuxOverviewStatus(
  rootDir = findCanvaLinuxProjectRoot(),
): c420uiOverviewStatus {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(rootDir);
}
