import {
  detectAppImageArtifacts,
  detectAppImageFullVersion,
  detectAppImageHash,
  detectAppImageVersion,
} from "./appimage-detection.js";
import {
  detectFlatpakSystemFullVersion,
  detectFlatpakSystemHash,
  detectFlatpakSystemInstall,
  detectFlatpakSystemVersion,
  detectFlatpakUserFullVersion,
  detectFlatpakUserHash,
  detectFlatpakUserInstall,
  detectFlatpakUserVersion,
} from "./flatpak-detection.js";
import {
  detectNativeSystemFullVersion,
  detectNativeSystemHash,
  detectNativeSystemInstall,
  detectNativeSystemVersion,
  detectNativeUserFullVersion,
  detectNativeUserHash,
  detectNativeUserInstall,
  detectNativeUserVersion,
} from "./native-detection.js";

export type InstallationDetectionResult = {
  DETECTED_NATIVE_SYSTEM: boolean;
  DETECTED_NATIVE_USER: boolean;
  DETECTED_FLATPAK_SYSTEM: boolean;
  DETECTED_FLATPAK_USER: boolean;
  DETECTED_APPIMAGE_ARTIFACTS: boolean;

  DETECTED_NATIVE_SYSTEM_VERSION: string;
  DETECTED_NATIVE_USER_VERSION: string;
  DETECTED_FLATPAK_SYSTEM_VERSION: string;
  DETECTED_FLATPAK_USER_VERSION: string;
  DETECTED_APPIMAGE_VERSION: string;

  DETECTED_NATIVE_SYSTEM_FULL_VERSION: string;
  DETECTED_NATIVE_USER_FULL_VERSION: string;
  DETECTED_FLATPAK_SYSTEM_FULL_VERSION: string;
  DETECTED_FLATPAK_USER_FULL_VERSION: string;
  DETECTED_APPIMAGE_FULL_VERSION: string;

  DETECTED_NATIVE_SYSTEM_HASH: string;
  DETECTED_NATIVE_USER_HASH: string;
  DETECTED_FLATPAK_SYSTEM_HASH: string;
  DETECTED_FLATPAK_USER_HASH: string;
  DETECTED_APPIMAGE_HASH: string;
};

export function detectInstallations(rootDir: string): InstallationDetectionResult {
  return {
    DETECTED_NATIVE_SYSTEM: detectNativeSystemInstall(),
    DETECTED_NATIVE_USER: detectNativeUserInstall(),
    DETECTED_FLATPAK_SYSTEM: detectFlatpakSystemInstall(),
    DETECTED_FLATPAK_USER: detectFlatpakUserInstall(),
    DETECTED_APPIMAGE_ARTIFACTS: detectAppImageArtifacts(rootDir),

    DETECTED_NATIVE_SYSTEM_VERSION: detectNativeSystemVersion(),
    DETECTED_NATIVE_USER_VERSION: detectNativeUserVersion(),
    DETECTED_FLATPAK_SYSTEM_VERSION: detectFlatpakSystemVersion(),
    DETECTED_FLATPAK_USER_VERSION: detectFlatpakUserVersion(),
    DETECTED_APPIMAGE_VERSION: detectAppImageVersion(rootDir),

    DETECTED_NATIVE_SYSTEM_FULL_VERSION: detectNativeSystemFullVersion(),
    DETECTED_NATIVE_USER_FULL_VERSION: detectNativeUserFullVersion(),
    DETECTED_FLATPAK_SYSTEM_FULL_VERSION: detectFlatpakSystemFullVersion(),
    DETECTED_FLATPAK_USER_FULL_VERSION: detectFlatpakUserFullVersion(),
    DETECTED_APPIMAGE_FULL_VERSION: detectAppImageFullVersion(rootDir),

    DETECTED_NATIVE_SYSTEM_HASH: detectNativeSystemHash(),
    DETECTED_NATIVE_USER_HASH: detectNativeUserHash(),
    DETECTED_FLATPAK_SYSTEM_HASH: detectFlatpakSystemHash(),
    DETECTED_FLATPAK_USER_HASH: detectFlatpakUserHash(),
    DETECTED_APPIMAGE_HASH: detectAppImageHash(rootDir),
  };
}

export function printDetectionStatusEnv(result: InstallationDetectionResult): void {
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
  }
}
