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

export type c420uiHostDependencyCheckResult = {
  status: c420uiHostDependencyCheckStatus;
  dependencies?: c420uiHostDependency[];
  message?: string;
  exitCode?: number;
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
