import path from "node:path";
import type {
  c420uiArtifactWorkflow,
  c420uiProjectCapabilities,
  c420uiRunnableArtifactWorkflow,
} from "../../packages/c420ui/src";

export type CanvaLinuxArtifactWorkflow = c420uiArtifactWorkflow &
  c420uiRunnableArtifactWorkflow & {
    outputPattern?: string;
  };

export function loadCanvaLinuxCapabilities(): c420uiProjectCapabilities {
  return {
    supportsArtifacts: true,
    supportsInstall: true,
    supportsUninstall: true,
    supportsPurge: true,
    supportsRelease: true,
    supportsRootActions: true,
    supportsDryRun: true,
    supportsPlannedActions: true,
  };
}

export function loadCanvaLinuxArtifactWorkflows(
  rootDir: string,
  version: string,
): CanvaLinuxArtifactWorkflow[] {
  void rootDir;
  const distPattern = path.join("dist", `canva-linux-${version}-*`);

  return [
    {
      id: "appimage",
      kind: "appimage",
      label: "AppImage",
      description: "Build and validate the concrete AppImage artifact for this project.",
      scope: "portable",
      buildActionId: "bundle-appimage",
      validateActionId: "validate-appimage",
      releaseActionId: "release-artifacts",
      outputPattern: `${distPattern}.AppImage`,
    },
    {
      id: "flatpak",
      kind: "flatpak",
      label: "Flatpak bundle",
      description: "Build, validate, install or uninstall the concrete Flatpak artifact for this project.",
      scope: "system",
      buildActionId: "bundle-flatpak",
      validateActionId: "validate-project",
      installActionId: "install-flatpak-system",
      uninstallActionId: "uninstall-flatpak-system",
      purgeActionId: "purge",
      releaseActionId: "release-artifacts",
      outputPattern: `${distPattern}.flatpak`,
      requiresRoot: true,
    },
    {
      id: "native-system",
      kind: "native",
      label: "Native system installation",
      description: "Install, uninstall or purge the concrete native system installation.",
      scope: "system",
      installActionId: "install-native-system",
      uninstallActionId: "uninstall-native-system",
      purgeActionId: "purge",
      requiresRoot: true,
    },
    {
      id: "native-user",
      kind: "native",
      label: "Native user installation",
      description: "Install, uninstall or purge the concrete native user installation.",
      scope: "user",
      installActionId: "install-native-user",
      uninstallActionId: "uninstall-native-user",
      purgeActionId: "purge",
    },
    {
      id: "release-tarball",
      kind: "tarball",
      label: "Linux unpacked tarball",
      description: "Release tarball generated from the Linux unpacked directory.",
      scope: "release",
      releaseActionId: "release-artifacts",
      outputPattern: path.join("dist", `canva-linux-${version}-linux-unpacked-*.tar.gz`),
    },
    {
      id: "release-checksums",
      kind: "custom",
      label: "SHA256SUMS",
      description: "Release checksum manifest for generated artifacts.",
      scope: "release",
      releaseActionId: "release-artifacts",
      outputPattern: path.join("dist", "SHA256SUMS"),
    },
    {
      id: "deb",
      kind: "deb",
      label: "Debian package",
      description: "Debian package support is planned and must not report false success.",
      scope: "none",
      planned: true,
    },
    {
      id: "rpm",
      kind: "rpm",
      label: "RPM package",
      description: "RPM package support is planned and must not report false success.",
      scope: "none",
      planned: true,
    },
    {
      id: "aur",
      kind: "aur",
      label: "AUR package",
      description: "AUR package support is planned and must not report false success.",
      scope: "none",
      planned: true,
      buildActionId: "prepare-aur",
    },
  ];
}
