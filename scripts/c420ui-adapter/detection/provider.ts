import fs from "node:fs";
import path from "node:path";
import {
  execFileSync,
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns,
} from "node:child_process";
import {
  boolFromC420UIDetectionValue,
  parseC420UIDetectionKeyValueLines,
  type c420uiDetectionProbe,
  type c420uiDetectionProbeResult,
  type c420uiOverviewStatus,
  type c420uiOverviewStatusProvider,
  type CanvaLinuxArtifactFragment,
} from "../../../packages/c420ui/src/detection";
import { findCanvaLinuxProjectRoot } from "../../canva-linux/project-root";
import { buildCanvaLinuxArtifactFragments } from "./artifact-fragments";

type CanvaLinuxDetectionCommandRunner = (
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) => SpawnSyncReturns<string>;

export type CanvaLinuxDetectionProviderOptions = {
  runCommand?: CanvaLinuxDetectionCommandRunner;
};

type CanvaLinuxDetectionProbe = Omit<c420uiDetectionProbe, "run"> & {
  run(rootDir: string): c420uiDetectionProbeResult;
};

type CanvaLinuxOverviewStatusProvider = Omit<
  c420uiOverviewStatusProvider,
  "buildOverviewStatus"
> & {
  buildOverviewStatus(rootDir: string): c420uiOverviewStatus;
};

type ProjectPackageJson = {
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

const canvaLinuxDetectionKeys = [
  "DETECTED_NATIVE_SYSTEM",
  "DETECTED_NATIVE_USER",
  "DETECTED_FLATPAK_SYSTEM",
  "DETECTED_FLATPAK_USER",
  "DETECTED_APPIMAGE_ARTIFACTS",

  "DETECTED_NATIVE_SYSTEM_VERSION",
  "DETECTED_NATIVE_USER_VERSION",
  "DETECTED_FLATPAK_SYSTEM_VERSION",
  "DETECTED_FLATPAK_USER_VERSION",
  "DETECTED_APPIMAGE_VERSION",

  "DETECTED_NATIVE_SYSTEM_FULL_VERSION",
  "DETECTED_NATIVE_USER_FULL_VERSION",
  "DETECTED_FLATPAK_SYSTEM_FULL_VERSION",
  "DETECTED_FLATPAK_USER_FULL_VERSION",
  "DETECTED_APPIMAGE_FULL_VERSION",
] as const;

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
};

function readPackage(rootDir: string): ProjectPackageJson {
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

function readPackageDependencyVersion(
  rootDir: string,
  name: string,
): string | undefined {
  const packageJson = readPackage(rootDir);

  return (
    packageJson.dependencies?.[name] ??
    packageJson.devDependencies?.[name]
  );
}

function normalizeSemverRange(value: string | undefined): string | undefined {
  const normalized = value
    ?.trim()
    .match(/(?:>=|>|<=|<|=|~|\^)?\s*v?([0-9]+(?:\.[0-9]+){0,2})/)?.[1];
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function readNodeVersion(rootDir: string): string | undefined {
  const packageJson = readPackage(rootDir);

  return (
    normalizeSemverRange(packageJson.engines?.node) ??
    process.versions.node
  );
}

const readNpmVersion = (() => {
  let cached: string | undefined;
  let attempted = false;

  return (): string | undefined => {
    if (attempted) {
      return cached;
    }

    attempted = true;

    try {
      cached = execFileSync(
        "npm",
        ["--version"],
        { encoding: "utf8" },
      ).trim();

      return cached;
    } catch {
      return undefined;
    }
  };
})();

function readPhase(rootDir: string): string {
  const content = fs.readFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    "utf8",
  );
  const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
  return match?.[1] ?? "unknown";
}

function safeRuntimeMetadata(rootDir: string): NonNullable<c420uiOverviewStatus["project"]["runtime"]> {
  try {
    return {
      node: readNodeVersion(rootDir) ?? "unknown",
      npm: readNpmVersion() ?? "unknown",
      electron: readPackageDependencyVersion(rootDir, "electron") ?? "unknown",
    };
  } catch {
    return {
      node: process.versions.node,
      npm: readNpmVersion() ?? "unknown",
      electron: "unknown",
    };
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
    runtime: safeRuntimeMetadata(rootDir),
  };
}

function detectionCommand(): string {
  return [
    "source packages/c420ui/scripts/install-detection-common.sh",
    "detect_installations",
    "print_detection_status_env",
  ].join("\n");
}

function runInstallDetection(
  rootDir: string,
  runCommand: CanvaLinuxDetectionCommandRunner,
): c420uiDetectionProbeResult {
  const warnings: string[] = [];
  let ok = true;

  try {
    const result = runCommand("bash", ["-c", detectionCommand()], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error) {
      ok = false;
      warnings.push(`Installation detection failed to start: ${result.error.message}`);
    }

    const stderr = result.stderr?.trim();
    if (stderr) warnings.push(stderr);

    if ((result.status ?? 0) !== 0) {
      ok = false;
      warnings.push(
        `Installation detection exited with status ${result.status ?? "unknown"}.`,
      );
    }

    return {
      ok,
      values: parseC420UIDetectionKeyValueLines(
        result.stdout || "",
        canvaLinuxDetectionKeys,
      ),
      warnings,
    };
  } catch (error) {
    warnings.push(
      `Installation detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { ok: false, values: {}, warnings };
  }
}

function createInstallDetectionProbe(
  runCommand: CanvaLinuxDetectionCommandRunner,
): CanvaLinuxDetectionProbe {
  return {
    id: "canva-linux-install-detection",
    label: "Canva Linux installation detection",
    run(rootDir: string): c420uiDetectionProbeResult {
      return runInstallDetection(rootDir, runCommand);
    },
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
  };
}

export function createCanvaLinuxDetectionProvider(
  options: CanvaLinuxDetectionProviderOptions = {},
): CanvaLinuxOverviewStatusProvider {
  const runCommand: CanvaLinuxDetectionCommandRunner =
    options.runCommand ?? spawnSync;

  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir: string): c420uiOverviewStatus {
      const project = safeProjectMetadata(rootDir);
      const probe = createInstallDetectionProbe(runCommand);
      const detection = probe.run(rootDir);
      const artifactFragments = buildCanvaLinuxArtifactFragments(rootDir);
      return {
        project,
        installations: {
          ...emptyInstallations,
          ...buildInstallations(detection.values, artifactFragments),
        },
        artifactFragments,
        warnings: detection.warnings ?? [],
      };
    },
  };
}

export function buildCanvaLinuxOverviewStatus(
  rootDir = findCanvaLinuxProjectRoot(),
): c420uiOverviewStatus {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(rootDir);
}
