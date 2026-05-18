import type { CanvaLinuxArtifactFragment, c420uiOverviewStatus } from "../detection";

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

function artifactVersion(fragment: CanvaLinuxArtifactFragment): string | undefined {
  return fragment.fullVersion || fragment.version;
}

function formatArtifactLine(
  fragment: CanvaLinuxArtifactFragment,
  formatStatus: (detected: boolean, version: string | boolean | undefined) => string,
): string {
  return `  ${fragment.label}: ${formatStatus(fragment.detected, artifactVersion(fragment))}`;
}

export function formatDetectedInstallationsSummary(
  s: c420uiOverviewStatus | null,
  colors: DetectionSummaryColors,
): string[] {
  if (!s) {
    return [
      `Detected Installations`,
      `  Native System: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `  Native User: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `  Flatpak System: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `  Flatpak User: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
      `Generated Artifacts`,
      `  AppImage: {${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`,
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

  const lines = [
    "Detected Installations",
    `  Native System: ${fmt(Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion))}`,
    `  Native User: ${fmt(Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion))}`,
    `  Flatpak System: ${fmt(Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion))}`,
    `  Flatpak User: ${fmt(Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion))}`,
  ];

  if (s.artifactFragments) {
    lines.push(
      "Generated Artifacts",
      ...s.artifactFragments.map((fragment) => formatArtifactLine(fragment, fmt)),
    );
  } else {
    lines.push(
      "Generated Artifacts",
      `  AppImage: ${fmt(Boolean(i.appImageArtifacts), detectedVersion(i.appImageFullVersion, i.appImageVersion))}`,
    );
  }

  return lines;
}
