import {
  detectAppImageArtifacts,
  detectAppImageFullVersion,
  detectAppImageVersion,
} from "./appimage-detection";
import {
  detectFlatpakSystemFullVersion,
  detectFlatpakSystemInstall,
  detectFlatpakSystemVersion,
  detectFlatpakUserFullVersion,
  detectFlatpakUserInstall,
  detectFlatpakUserVersion,
} from "./flatpak-detection";
import {
  detectNativeSystemFullVersion,
  detectNativeSystemInstall,
  detectNativeSystemVersion,
  detectNativeUserFullVersion,
  detectNativeUserInstall,
  detectNativeUserVersion,
} from "./native-detection";

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
  };
}

export function printDetectionStatusEnv(result: InstallationDetectionResult): void {
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
  }
}
