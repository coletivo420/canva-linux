import fs from "node:fs";
import path from "node:path";
import {
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns,
} from "node:child_process";
import {
  boolFromC420UIDetectionValue,
  parseC420UIDetectionKeyValueLines,
  type c420uiOverviewStatus,
  type c420uiOverviewStatusProvider,
} from "../../../packages/c420ui/src/detection";
import { findCanvaLinuxProjectRoot } from "../project-root";

type CanvaLinuxDetectionCommandRunner = (
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
) => SpawnSyncReturns<string>;

export type CanvaLinuxDetectionProviderOptions = {
  runCommand?: CanvaLinuxDetectionCommandRunner;
};

type PackageJson = {
  version?: string;
  repository?: { url?: string } | string;
};

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
};

function readPackage(rootDir: string): PackageJson {
  return JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as PackageJson;
}

function readPhase(rootDir: string): string {
  const content = fs.readFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    "utf8",
  );
  const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
  return match?.[1] ?? "unknown";
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

function detectionCommand(): string {
  return [
    "source scripts/install-detection-common.sh",
    "detect_installations",
    "print_detection_status_env",
  ].join("\n");
}

function runDetection(
  rootDir: string,
  runCommand: CanvaLinuxDetectionCommandRunner,
): { values: Record<string, string>; warnings: string[] } {
  const warnings: string[] = [];

  try {
    const result = runCommand("bash", ["-c", detectionCommand()], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error) {
      warnings.push(`Installation detection failed to start: ${result.error.message}`);
    }

    const stderr = result.stderr?.trim();
    if (stderr) warnings.push(stderr);

    if ((result.status ?? 0) !== 0) {
      warnings.push(
        `Installation detection exited with status ${result.status ?? "unknown"}.`,
      );
    }

    return {
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
    return { values: {}, warnings };
  }
}

function buildInstallations(values: Record<string, string>): c420uiOverviewStatus["installations"] {
  return {
    nativeSystem: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_SYSTEM),
    nativeUser: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_USER),
    flatpakSystem: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_SYSTEM),
    flatpakUser: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_USER),
    appImageArtifacts: boolFromC420UIDetectionValue(values.DETECTED_APPIMAGE_ARTIFACTS),
    nativeSystemVersion: values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserVersion: values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemVersion: values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserVersion: values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageVersion: values.DETECTED_APPIMAGE_VERSION || "",
  };
}

export function createCanvaLinuxDetectionProvider(
  options: CanvaLinuxDetectionProviderOptions = {},
): c420uiOverviewStatusProvider {
  const runCommand = options.runCommand ?? spawnSync;

  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir: string): c420uiOverviewStatus {
      const project = safeProjectMetadata(rootDir);
      const detection = runDetection(rootDir, runCommand as CanvaLinuxDetectionCommandRunner);
      return {
        project,
        package: project,
        installations: {
          ...emptyInstallations,
          ...buildInstallations(detection.values),
        },
        warnings: detection.warnings,
      } as c420uiOverviewStatus & { package: c420uiOverviewStatus["project"] };
    },
  };
}

export function buildCanvaLinuxOverviewStatus(
  rootDir = findCanvaLinuxProjectRoot(),
): c420uiOverviewStatus {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(
    rootDir,
  ) as c420uiOverviewStatus;
}
