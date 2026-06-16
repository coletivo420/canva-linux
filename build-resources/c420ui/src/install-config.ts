import path from "node:path";

export type c420uiNativeInstallPaths = {
  prefix: string;
  bin: string;
  desktop: string;
  iconRoot: string;
};

export type c420uiNativeInstallConfig = {
  appId: string;
  executable: string;
  desktopName: string;
  system: c420uiNativeInstallPaths;
  user: c420uiNativeInstallPaths;
};

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertNoTraversal(value: string, label: string): void {
  if (value.includes("..") || path.isAbsolute(value)) {
    throw new Error(`${label} must be relative and must not contain parent traversal`);
  }
}

function validatePathGroup(input: unknown, label: string, absolute: boolean): c420uiNativeInstallPaths {
  const obj = requireObject(input, label);
  const group = {
    prefix: requireString(obj.prefix, `${label}.prefix`),
    bin: requireString(obj.bin, `${label}.bin`),
    desktop: requireString(obj.desktop, `${label}.desktop`),
    iconRoot: requireString(obj.iconRoot, `${label}.iconRoot`),
  };
  for (const [key, value] of Object.entries(group)) {
    if (absolute && !path.isAbsolute(value)) {
      throw new Error(`${label}.${key} must be absolute`);
    }
    if (!absolute) {
      assertNoTraversal(value, `${label}.${key}`);
    }
  }
  return group;
}

export function validateC420UINativeInstallConfig(input: unknown): c420uiNativeInstallConfig {
  const obj = requireObject(input, "native install config");
  const config = {
    appId: requireString(obj.appId, "appId"),
    executable: requireString(obj.executable, "executable"),
    desktopName: requireString(obj.desktopName, "desktopName"),
    system: validatePathGroup(obj.system, "system", true),
    user: validatePathGroup(obj.user, "user", false),
  };
  assertNoTraversal(config.executable, "executable");
  if (!config.desktopName.endsWith(".desktop")) {
    throw new Error("desktopName must end with .desktop");
  }
  return config;
}
