import type { CanvaLinuxArtifactFragment, c420uiOverviewStatus } from "../detection";

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

function artifactVersion(fragment: CanvaLinuxArtifactFragment): string | undefined {
  return fragment.fullVersion || fragment.version;
}

function formatDetectedStatus(
  colors: DetectionSummaryColors,
  detected: boolean,
  version: string | boolean | undefined,
): string {
  if (!detected) {
    return `{${colors.statusNotDetected}-fg}not detected{/${colors.statusNotDetected}-fg}`;
  }
  const v =
    typeof version === "string" && version.trim()
      ? `v${version.trim().replace(/^v/, "")}`
      : "version unknown";
  return `{${colors.statusDetected}-fg}detected{/${colors.statusDetected}-fg}      ${v}`;
}

function formatArtifactLine(
  fragment: CanvaLinuxArtifactFragment,
  colors: DetectionSummaryColors,
): string {
  return `  ${fragment.label}: ${formatDetectedStatus(colors, fragment.detected, artifactVersion(fragment))}`;
}

function isGeneratedArtifactFragment(fragment: CanvaLinuxArtifactFragment): boolean {
  if (fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked") return false;
  if (fragment.kind === "native" || fragment.id === "native-system" || fragment.id === "native-user") return false;
  return GENERATED_ARTIFACT_KINDS.has(fragment.kind) || GENERATED_ARTIFACT_KINDS.has(fragment.id);
}

function linuxArtifactSummaryItem(label: string, detected: boolean, version: string | boolean | undefined): string {
  if (!detected) return `${label} not detected`;
  if (typeof version === "string" && version.trim()) return `${label} v${version.trim().replace(/^v/, "")}`;
  return `${label} version unknown`;
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
      linuxArtifacts: [`Native system installation loading, Native user installation loading, Linux unpacked loading`],
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
        )}`,
      ];

  return {
    detectedInstallations: [
      `  Native System: ${formatDetectedStatus(colors, Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion))}`,
      `  Native User: ${formatDetectedStatus(colors, Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion))}`,
      `  Flatpak System: ${formatDetectedStatus(colors, Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion))}`,
      `  Flatpak User: ${formatDetectedStatus(colors, Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion))}`,
    ],
    generatedArtifacts,
    linuxArtifacts: [
      [
        linuxArtifactSummaryItem(
          "Native system installation",
          Boolean(i.nativeSystem),
          detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion),
        ),
        linuxArtifactSummaryItem(
          "Native user installation",
          Boolean(i.nativeUser),
          detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion),
        ),
        linuxArtifactSummaryItem(
          "Linux unpacked",
          Boolean(linuxUnpacked?.detected),
          linuxUnpacked ? artifactVersion(linuxUnpacked) : undefined,
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
