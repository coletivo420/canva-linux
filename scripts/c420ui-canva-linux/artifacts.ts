import path from "node:path";
import type {
  C420UIArtifactWorkflow,
  C420UIProjectCapabilities,
} from "../../packages/c420ui/src";

export function loadCanvaLinuxCapabilities(): C420UIProjectCapabilities {
  return {
    artifacts: {
      appimage: "supported",
      flatpak: "supported",
      native: "supported",
      tarball: "supported",
      checksums: "supported",
      deb: "planned",
      rpm: "planned",
      aur: "planned",
    },
    installScopes: {
      system: "supported",
      user: "supported",
    },
    workflows: {
      development: "supported",
      build: "supported",
      package: "supported",
      install: "supported",
      uninstall: "supported",
      purge: "supported",
      release: "supported",
      validation: "supported",
      logs: "supported",
    },
    sudoProvider: "supported",
    releaseValidation: "supported",
  };
}

export function loadCanvaLinuxArtifactWorkflows(
  rootDir: string,
  version: string,
): C420UIArtifactWorkflow[] {
  const distPattern = path.join("dist", `canva-linux-${version}-*`);

  return [
    {
      id: "package-appimage",
      label: "Create AppImage package",
      description: "Build the concrete AppImage artifact for this project.",
      supportsDryRun: true,
      artifacts: [
        {
          id: "appimage",
          kind: "appimage",
          label: "AppImage",
          outputPattern: `${distPattern}.AppImage`,
          actionId: "bundle-appimage",
          validatesWith: ["validate-appimage"],
        },
      ],
      actions: [],
    },
    {
      id: "package-flatpak",
      label: "Create Flatpak bundle",
      description: "Build the concrete Flatpak artifact for this project.",
      supportsDryRun: true,
      artifacts: [
        {
          id: "flatpak",
          kind: "flatpak",
          label: "Flatpak bundle",
          outputPattern: `${distPattern}.flatpak`,
          actionId: "bundle-flatpak",
          validatesWith: ["validate-flathub-submission"],
        },
      ],
      actions: [],
    },
    {
      id: "release-artifacts",
      label: "Release artifacts",
      description: "Produce release outputs owned by the project adapter.",
      supportsDryRun: true,
      artifacts: [
        {
          id: "appimage-release",
          kind: "appimage",
          label: "Release AppImage",
          outputPattern: `${distPattern}.AppImage`,
          actionId: "bundle-appimage",
        },
        {
          id: "flatpak-release",
          kind: "flatpak",
          label: "Release Flatpak",
          outputPattern: `${distPattern}.flatpak`,
          actionId: "bundle-flatpak",
        },
        {
          id: "linux-unpacked-tarball",
          kind: "tarball",
          label: "Linux unpacked tarball",
          outputPattern: path.join("dist", `canva-linux-${version}-linux-unpacked-*.tar.gz`),
        },
        {
          id: "sha256sums",
          kind: "checksums",
          label: "SHA256SUMS",
          outputPattern: path.join("dist", "SHA256SUMS"),
        },
      ],
      actions: [],
    },
    {
      id: "package-deb",
      label: "Create Debian package",
      description: "Debian package support is planned and must not report false success.",
      artifacts: [
        {
          id: "deb",
          kind: "deb",
          label: "Debian package",
          planned: true,
        },
      ],
      actions: [
        {
          id: "package-deb-planned",
          label: "Debian package support is planned",
          group: "development",
          section: "Package generation",
          kind: "planned",
          planned: true,
          phase: "package",
          exitCodeOnPlanned: 4,
        },
      ],
    },
  ];
}
