import type { c420uiOverviewStatus } from "../detection";

type DetectionSummaryColors = {
  appImageLoading: string;
  statusDetected: string;
  statusNotDetected: string;
};

export function detectedVersion(
  fullVersion: string | boolean | undefined,
  version: string | boolean | undefined,
): string | boolean | undefined {
  if (typeof fullVersion === "string" && fullVersion.trim()) {
    return fullVersion;
  }
  return version;
}

export function formatDetectedInstallationsSummary(
  s: c420uiOverviewStatus | null,
  colors: DetectionSummaryColors,
): string[] {
  if (!s) {
    return [
      `  Native Install: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `  Flatpak Install: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `  AppImage artifacts: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
    ];
  }
  const i = s.installations;
  const fmt = (detected: boolean, version: string | boolean | undefined) => {
    if (!detected) {
      return `{${colors.statusNotDetected}-fg}not detected{/${colors.statusNotDetected}-fg}`;
    }
    const v =
      typeof version === "string" && version.trim()
        ? `v${version.trim().replace(/^v/, "")}`
        : "version unknown";
    return `{${colors.statusDetected}-fg}detected{/${colors.statusDetected}-fg}      ${v}`;
  };
  return [
    `  Native System: ${fmt(Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion))}`,
    `  Native User: ${fmt(Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion))}`,
    `  Flatpak System: ${fmt(Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion))}`,
    `  Flatpak User: ${fmt(Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion))}`,
    `  AppImage: ${fmt(Boolean(i.appImageArtifacts), detectedVersion(i.appImageFullVersion, i.appImageVersion))}`,
  ];
}
