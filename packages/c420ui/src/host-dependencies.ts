export type c420uiHostDependencyPurpose =
  | "terminal"
  | "cli"
  | "development"
  | "build"
  | "package"
  | "validation"
  | "release";

export type c420uiHostDependency = {
  id: string;
  label: string;
  command?: string;
  requiredFor?: c420uiHostDependencyPurpose[];
};

export type c420uiCommandDependency = {
  id: string;
  command: string;
  required?: boolean;
  requiredFor?: c420uiHostDependencyPurpose[];
  installHint?: string;
};

export type c420uiNodeDependencyConfig = {
  minimumMajor?: number;
  required?: boolean;
};

export type c420uiNpmDependencyConfig = {
  packageManager: "npm";
  lockfile?: string;
  installStrategy?: "auto" | "ci" | "install";
  includeDev?: boolean;
  requiredDependencies?: string[];
  requiredDevDependencies?: string[];
};

export type c420uiHostDependencyConfig = {
  node?: c420uiNodeDependencyConfig;
  commands?: c420uiCommandDependency[];
  npm?: c420uiNpmDependencyConfig;
};

export type c420uiHostDependencyEnsureOptions = {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
};

export type c420uiHostDependencyCheckStatus =
  | "available"
  | "missing"
  | "failed"
  | "skipped";

export type c420uiPlannedHostDependencyCommand = {
  command: string;
  args: string[];
  cwd?: string;
};

export type c420uiHostDependencyCheckResult = {
  status: c420uiHostDependencyCheckStatus;
  dependencies?: c420uiHostDependency[];
  message?: string;
  exitCode?: number;
  plannedCommand?: c420uiPlannedHostDependencyCommand;
};

export type c420uiHostDependencyProvider = {
  id: string;
  label?: string;
  check():
    | Promise<c420uiHostDependencyCheckResult>
    | c420uiHostDependencyCheckResult;
  ensure?():
    | Promise<c420uiHostDependencyCheckResult>
    | c420uiHostDependencyCheckResult;
};

const c420uiKnownHostDependencyPurposes: c420uiHostDependencyPurpose[] = [
  "terminal",
  "cli",
  "development",
  "build",
  "package",
  "validation",
  "release",
];

const c420uiKnownNpmInstallStrategies = ["auto", "ci", "install"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOptionalBoolean(
  value: Record<string, unknown>,
  key: string,
  failures: string[],
  path: string,
): void {
  if (key in value && typeof value[key] !== "boolean") {
    failures.push(`${path}.${key} must be a boolean`);
  }
}

function assertOptionalString(
  value: Record<string, unknown>,
  key: string,
  failures: string[],
  path: string,
): void {
  if (key in value && typeof value[key] !== "string") {
    failures.push(`${path}.${key} must be a string`);
  }
}

function assertOptionalStringArray(
  value: Record<string, unknown>,
  key: string,
  failures: string[],
  path: string,
): void {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some((item) => typeof item !== "string")) {
    failures.push(`${path}.${key} must be a string array`);
  }
}

function assertOptionalPurposeArray(
  value: Record<string, unknown>,
  key: string,
  failures: string[],
  path: string,
): void {
  if (!(key in value)) return;
  const array = value[key];
  if (
    !Array.isArray(array) ||
    array.some(
      (item) =>
        typeof item !== "string" ||
        !c420uiKnownHostDependencyPurposes.includes(item as c420uiHostDependencyPurpose),
    )
  ) {
    failures.push(`${path}.${key} must contain only known host dependency purposes`);
  }
}

function validateConfigShape(value: unknown): string[] {
  const failures: string[] = [];
  if (!isRecord(value)) return ["host dependency config must be an object"];

  if ("node" in value) {
    if (!isRecord(value.node)) {
      failures.push("node must be an object");
    } else {
      if ("minimumMajor" in value.node && typeof value.node.minimumMajor !== "number") {
        failures.push("node.minimumMajor must be a number");
      }
      assertOptionalBoolean(value.node, "required", failures, "node");
    }
  }

  if ("commands" in value) {
    if (!Array.isArray(value.commands)) {
      failures.push("commands must be an array");
    } else {
      value.commands.forEach((command, index) => {
        const commandPath = `commands[${index}]`;
        if (!isRecord(command)) {
          failures.push(`${commandPath} must be an object`);
          return;
        }
        if (typeof command.id !== "string") failures.push(`${commandPath}.id must be a string`);
        if (typeof command.command !== "string") failures.push(`${commandPath}.command must be a string`);
        assertOptionalBoolean(command, "required", failures, commandPath);
        assertOptionalPurposeArray(command, "requiredFor", failures, commandPath);
        assertOptionalString(command, "installHint", failures, commandPath);
      });
    }
  }

  if ("npm" in value) {
    if (!isRecord(value.npm)) {
      failures.push("npm must be an object");
    } else {
      if (value.npm.packageManager !== "npm") failures.push('npm.packageManager must be "npm"');
      assertOptionalString(value.npm, "lockfile", failures, "npm");
      if (
        "installStrategy" in value.npm &&
        !c420uiKnownNpmInstallStrategies.includes(value.npm.installStrategy as (typeof c420uiKnownNpmInstallStrategies)[number])
      ) {
        failures.push('npm.installStrategy must be "auto", "ci", or "install"');
      }
      assertOptionalBoolean(value.npm, "includeDev", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDependencies", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDevDependencies", failures, "npm");
    }
  }

  return failures;
}

export function assertC420UIHostDependencyConfig(
  value: unknown,
): asserts value is c420uiHostDependencyConfig {
  const failures = validateConfigShape(value);
  if (failures.length > 0) {
    throw new Error(`Invalid c420ui host dependency config: ${failures.join("; ")}.`);
  }
}

export function validateC420UIHostDependencyConfig(
  value: unknown,
): c420uiHostDependencyConfig {
  assertC420UIHostDependencyConfig(value);
  return value;
}

export function createC420UIHostDependencyResult(
  status: c420uiHostDependencyCheckStatus,
  options: Omit<c420uiHostDependencyCheckResult, "status"> = {},
): c420uiHostDependencyCheckResult {
  return {
    status,
    ...options,
  };
}

export function isC420UIHostDependencyFailure(
  result: c420uiHostDependencyCheckResult,
): boolean {
  return result.status === "missing" || result.status === "failed";
}
