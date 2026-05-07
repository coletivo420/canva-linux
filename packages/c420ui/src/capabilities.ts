export type C420UICapabilityStatus = "supported" | "planned" | "unsupported";

export type C420UICapability = {
  id: string;
  label: string;
  status: C420UICapabilityStatus;
  reason?: string;
};

export type C420UIProjectCapabilities = {
  artifacts: Record<string, C420UICapabilityStatus>;
  installScopes: Record<string, C420UICapabilityStatus>;
  workflows: Record<string, C420UICapabilityStatus>;
  sudoProvider: C420UICapabilityStatus;
  releaseValidation: C420UICapabilityStatus;
};

export function hasC420UICapability(
  capabilities: C420UIProjectCapabilities,
  category: keyof Omit<C420UIProjectCapabilities, "sudoProvider" | "releaseValidation">,
  id: string,
): boolean {
  return capabilities[category][id] === "supported";
}
