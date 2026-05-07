#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findProjectRoot } from "./action-registry";

type DetectionLines = Record<string, string>;

const detectionKeys = [
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

function readPackage(rootDir: string) {
  return JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as { version?: string; repository?: { url?: string } };
}

function readPhase(rootDir: string) {
  const content = fs.readFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    "utf8",
  );
  const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
  return match ? match[1] : "unknown";
}

function parseKeyValueLines(text: string): DetectionLines {
  const result: DetectionLines = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if ((detectionKeys as readonly string[]).includes(key)) result[key] = value;
  }
  return result;
}

function detect(rootDir: string): DetectionLines {
  const script = [
    "source scripts/install-detection-common.sh",
    "detect_installations",
    "print_detection_status_env",
  ].join("\n");
  const result = spawnSync("bash", ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stderr?.trim()) process.stderr.write(result.stderr);
  if ((result.status ?? 0) !== 0) {
    process.stderr.write(
      `[warn] Installation detection exited with status ${result.status ?? "unknown"}.\n`,
    );
  }
  return parseKeyValueLines(result.stdout || "");
}

function bool(value: string | undefined) {
  return value === "true";
}

export function buildOverviewStatus(rootDir = findProjectRoot()) {
  const pkg = readPackage(rootDir);
  const lines = detect(rootDir);
  return {
    package: {
      version: pkg.version || "unknown",
      phase: readPhase(rootDir),
      appId: "io.github.coletivo420.canva-linux",
      executable: "canva-linux",
      repository: "https://github.com/coletivo420/canva-linux",
    },
    installations: {
      nativeSystem: bool(lines.DETECTED_NATIVE_SYSTEM),
      nativeUser: bool(lines.DETECTED_NATIVE_USER),
      flatpakSystem: bool(lines.DETECTED_FLATPAK_SYSTEM),
      flatpakUser: bool(lines.DETECTED_FLATPAK_USER),
      appImageArtifacts: bool(lines.DETECTED_APPIMAGE_ARTIFACTS),
      nativeSystemVersion: lines.DETECTED_NATIVE_SYSTEM_VERSION || "",
      nativeUserVersion: lines.DETECTED_NATIVE_USER_VERSION || "",
      flatpakSystemVersion: lines.DETECTED_FLATPAK_SYSTEM_VERSION || "",
      flatpakUserVersion: lines.DETECTED_FLATPAK_USER_VERSION || "",
      appImageVersion: lines.DETECTED_APPIMAGE_VERSION || "",
    },
  };
}

export function main(): number {
  console.log(JSON.stringify(buildOverviewStatus()));
  return 0;
}

if (
  require.main === module &&
  /overview-status\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    process.stderr.write(
      `[warn] Failed to build overview status: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.log(
      JSON.stringify({
        package: {
          version: "unknown",
          phase: "unknown",
          appId: "io.github.coletivo420.canva-linux",
          executable: "canva-linux",
          repository: "https://github.com/coletivo420/canva-linux",
        },
        installations: {
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
        },
      }),
    );
    process.exit(0);
  }
}
