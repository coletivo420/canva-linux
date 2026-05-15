import type {
  c420uiHostDependencyCheckResult,
  c420uiNodeDependencyConfig,
} from "./host-dependencies";

function parseMajor(version: string): number | null {
  const normalized = version.startsWith("v") ? version.slice(1) : version;
  const major = Number(normalized.split(".")[0]);
  return Number.isFinite(major) ? major : null;
}

export function checkC420UINodeDependency(
  config: c420uiNodeDependencyConfig | undefined,
  options: {
    nodeVersion?: string;
  } = {},
): c420uiHostDependencyCheckResult {
  if (!config || config.required === false) {
    return { status: "skipped", message: "No required Node.js dependency was declared." };
  }

  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const currentMajor = parseMajor(nodeVersion);
  if (currentMajor === null) {
    return {
      status: "failed",
      exitCode: 1,
      message: `Unable to parse Node.js version: ${nodeVersion}.`,
    };
  }

  if (typeof config.minimumMajor === "number" && currentMajor < config.minimumMajor) {
    return {
      status: "failed",
      exitCode: 1,
      message: `Node.js major version ${config.minimumMajor} or newer is required. Current version: ${nodeVersion}.`,
    };
  }

  return { status: "available", message: "Node.js dependency is available." };
}
