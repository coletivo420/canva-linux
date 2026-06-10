import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  readBuildMetadataBaseVersion,
  readBuildMetadataFullVersion,
  readBuildMetadataHash,
  readPackageJsonVersion,
  readVersionFile,
} from "./version-marker.js";

const APP_EXECUTABLE = "canva-linux";
const APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";

export function detectNativeSystemInstall(): boolean {
  return (
    fs.existsSync("/opt/canva-linux") ||
    fs.existsSync(`/usr/local/bin/${APP_EXECUTABLE}`) ||
    fs.existsSync(`/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`)
  );
}

export function detectNativeUserInstall(): boolean {
  const home = os.homedir();
  return (
    fs.existsSync(path.join(home, ".local/opt/canva-linux")) ||
    fs.existsSync(path.join(home, `.local/bin/${APP_EXECUTABLE}`)) ||
    fs.existsSync(
      path.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`),
    )
  );
}

export function detectNativeSystemVersion(): string {
  let version = readBuildMetadataBaseVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json",
  );
  if (version) return version;

  version = readVersionFile("/opt/canva-linux/CANVA_LINUX_VERSION");
  if (version) return version;

  return readPackageJsonVersion("/opt/canva-linux/package.json");
}

export function detectNativeUserVersion(): string {
  const home = os.homedir();
  let version = readBuildMetadataBaseVersion(
    path.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json"),
  );
  if (version) return version;

  version = readVersionFile(
    path.join(home, ".local/opt/canva-linux/CANVA_LINUX_VERSION"),
  );
  if (version) return version;

  return readPackageJsonVersion(
    path.join(home, ".local/opt/canva-linux/package.json"),
  );
}

export function detectNativeSystemFullVersion(): string {
  const version = readBuildMetadataFullVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json",
  );
  if (version) return version;

  return detectNativeSystemVersion();
}

export function detectNativeUserFullVersion(): string {
  const home = os.homedir();
  const version = readBuildMetadataFullVersion(
    path.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json"),
  );
  if (version) return version;

  return detectNativeUserVersion();
}

export function detectNativeSystemHash(): string {
  return readBuildMetadataHash(
    "/opt/canva-linux/config/canva-linux/build-metadata.json",
    "canvaLinuxSourceHash",
  );
}

export function detectNativeUserHash(): string {
  const home = os.homedir();
  return readBuildMetadataHash(
    path.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json"),
    "canvaLinuxSourceHash",
  );
}
