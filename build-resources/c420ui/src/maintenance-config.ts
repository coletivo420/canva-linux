export type c420uiMaintenanceConfig = {
  cleanupTargets?: string[];
  permissionTargets?: string[];
};

function validateTargetList(input: unknown, field: string): string[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new Error(`${field} must be an array`);
  }

  return input.map((target, index) => {
    if (typeof target !== "string") {
      throw new Error(`${field}[${index}] must be a string`);
    }
    const trimmed = target.trim();
    if (!trimmed) {
      throw new Error(`${field}[${index}] must not be empty`);
    }
    if (trimmed.startsWith("/") || trimmed === "." || trimmed === "/" || trimmed.includes("\\")) {
      throw new Error(`${field}[${index}] must be a safe relative path`);
    }
    if (trimmed.split("/").includes("..")) {
      throw new Error(`${field}[${index}] must not contain ..`);
    }
    return trimmed;
  });
}

export function validateC420UIMaintenanceConfig(input: unknown): c420uiMaintenanceConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("maintenance config must be an object");
  }
  const value = input as Record<string, unknown>;
  return {
    cleanupTargets: validateTargetList(value.cleanupTargets, "cleanupTargets"),
    permissionTargets: validateTargetList(value.permissionTargets, "permissionTargets"),
  };
}
