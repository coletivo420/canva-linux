import type { CanvaLinuxArtifactFragment, c420uiOverviewStatus } from "../detection.js";

type DetectionSummaryColors = {
  appImageLoading: string;
  statusDetected: string;
  statusNotDetected: string;
};

export type DetectionPanelSummaries = {
  detectedInstallations: string[];
  generatedArtifacts: string[];
  linuxArtifacts: string[];
};

const GENERATED_ARTIFACT_KINDS = new Set([
  "appimage",
  "flatpak",
  "tarball",
  "sha256sums",
  "deb",
  "rpm",
  "aur",
]);

export function detectedVersion(
  fullVersion: string | boolean | undefined,
  version: string | boolean | undefined,
): string | boolean | undefined {
  if (typeof fullVersion === "string" && fullVersion.trim()) {
    return fullVersion;
  }
  return version;
}

function formatShortHash(hash: string | undefined, version: string | undefined): string {
  void version;
  if (!hash) return "";
  if (hash === "unknown") return " · unknown";
  const parts = hash.split(":");
  const algo = parts.length > 1 ? `${parts[0]}:` : "";
  const value = (parts.length > 1 ? parts[1] : parts[0]) || "";
  return ` · ${algo}${value.slice(0, 8)}`;
}

function artifactVersion(fragment: CanvaLinuxArtifactFragment): string | undefined {
  return fragment.fullVersion || fragment.version;
}

function formatDetectedStatus(
  colors: DetectionSummaryColors,
  detected: boolean,
  version: string | boolean | undefined,
  hash?: string,
): string {
  if (!detected) {
    return `{${colors.statusNotDetected}-fg}not detected{/${colors.statusNotDetected}-fg}`;
  }
  return typeof version === "string" && version.trim()
    ? `v${version.trim().replace(/^v/, "")}${formatShortHash(hash, version)}`
    : "version unknown";
}

function formatArtifactLine(
  fragment: CanvaLinuxArtifactFragment,
  colors: DetectionSummaryColors,
): string {
  return `  ${fragment.label}: ${formatDetectedStatus(colors, fragment.detected, artifactVersion(fragment), fragment.hash)}`;
}

function isGeneratedArtifactFragment(fragment: CanvaLinuxArtifactFragment): boolean {
  if (fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked") return false;
  if (fragment.kind === "native" || fragment.id === "native-system" || fragment.id === "native-user") return false;
  return GENERATED_ARTIFACT_KINDS.has(fragment.kind) || GENERATED_ARTIFACT_KINDS.has(fragment.id);
}

function versionSummaryItem(
  label: string,
  version: string | undefined,
  hash?: string,
): string {
  return `${label} ${version ? `v${version.trim().replace(/^v/, "")}${formatShortHash(hash, version)}` : "unknown"}`;
}

export function formatDetectionPanelSummaries(
  s: c420uiOverviewStatus | null,
  colors: DetectionSummaryColors,
): DetectionPanelSummaries {
  if (!s) {
    const loading = `{${colors.appImageLoading}-fg}loading...{/${colors.appImageLoading}-fg}`;
    return {
      detectedInstallations: [
        `  Native System: ${loading}`,
        `  Native User: ${loading}`,
        `  Flatpak System: ${loading}`,
        `  Flatpak User: ${loading}`,
      ],
      generatedArtifacts: [`  AppImage: ${loading}`],
      linuxArtifacts: [`Electron/Node/npm loading...`],
    };
  }

  const i = s.installations;
  const linuxUnpacked = s.artifactFragments?.find(
    (fragment) => fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked",
  );

  const generatedArtifacts = s.artifactFragments
    ? s.artifactFragments.filter(isGeneratedArtifactFragment).map((fragment) => formatArtifactLine(fragment, colors))
    : [
        `  AppImage: ${formatDetectedStatus(
          colors,
          Boolean(i.appImageArtifacts),
          detectedVersion(i.appImageFullVersion, i.appImageVersion),
          i.appImageHash as string | undefined,
        )}`,
      ];

  return {
    detectedInstallations: [
      `  Native System: ${formatDetectedStatus(colors, Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion), i.nativeSystemHash as string | undefined)}`,
      `  Native User: ${formatDetectedStatus(colors, Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion), i.nativeUserHash as string | undefined)}`,
      `  Flatpak System: ${formatDetectedStatus(colors, Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion), i.flatpakSystemHash as string | undefined)}`,
      `  Flatpak User: ${formatDetectedStatus(colors, Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion), i.flatpakUserHash as string | undefined)}`,
    ],
    generatedArtifacts,
    linuxArtifacts: [
      [
        versionSummaryItem("Electron", s.runtime?.electronVersion),
        versionSummaryItem("Node", s.runtime?.nodeVersion),
        versionSummaryItem("npm", s.runtime?.npmVersion),
        versionSummaryItem(
          "Linux unpacked",
          linuxUnpacked ? artifactVersion(linuxUnpacked) : undefined,
          linuxUnpacked?.hash,
        ),
      ].join(", "),
    ],
  };
}

export function formatDetectedInstallationsSummary(
  s: c420uiOverviewStatus | null,
  colors: DetectionSummaryColors,
): string[] {
  const panels = formatDetectionPanelSummaries(s, colors);
  return [
    "Detected Installations",
    ...panels.detectedInstallations,
    "Generated Artifacts",
    ...panels.generatedArtifacts,
    "Linux Artifacts",
    ...panels.linuxArtifacts,
  ];
}
