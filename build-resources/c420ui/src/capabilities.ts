export type c420uiProjectCapabilities = {
  supportsArtifacts?: boolean;
  supportsInstall?: boolean;
  supportsUninstall?: boolean;
  supportsPurge?: boolean;
  supportsRelease?: boolean;
  supportsRootActions?: boolean;
  supportsDryRun?: boolean;
  supportsPlannedActions?: boolean;
};

export type C420UIProjectCapabilities = c420uiProjectCapabilities;
export type C420UICapabilityStatus = "supported" | "planned" | "unsupported";

export type C420UICapability = {
  id: string;
  label: string;
  status: C420UICapabilityStatus;
  reason?: string;
};

export function hasC420UICapability(
  capabilities: c420uiProjectCapabilities,
  id: keyof c420uiProjectCapabilities,
): boolean {
  return capabilities[id] === true;
}
