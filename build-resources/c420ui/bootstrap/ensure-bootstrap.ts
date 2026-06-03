import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { calculateC420UISourceHash } from "./source-hash.js";
import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
  c420uiBootstrapArtifactPath,
} from "../checks/bootstrap-check-helpers.js";

export type C420UIBootstrapStatus =
  | { state: "valid" }
  | { state: "missing"; reason: string }
  | { state: "stale"; reason: string }
  | { state: "invalid"; reason: string };

export type C420UIBootstrapDeps = {
  calculateSourceHash: (rootDir: string) => string;
  spawn: (
    command: string,
    args: readonly string[],
    options?: Parameters<typeof spawnSync>[2],
  ) => ReturnType<typeof spawnSync>;
};

const DEFAULT_DEPS: C420UIBootstrapDeps = {
  calculateSourceHash: calculateC420UISourceHash,
  spawn: spawnSync,
};

function readJson<T>(absolutePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function summarizeCommandFailure(result: ReturnType<typeof spawnSync>): string {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}

function resolveBootstrapBuildRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      const scripts = readJson<{ scripts?: Record<string, string> }>(pkgPath)?.scripts;
      if (scripts?.["build:c420ui-bootstrap"]) return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function validateNodeCheck(
  rootDir: string,
  relativePath: string,
  deps: C420UIBootstrapDeps,
): string | null {
  const result = deps.spawn(process.execPath, ["--check", path.join(rootDir, relativePath)], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  // Some constrained environments can report EPERM from spawnSync even when the
  // check command itself succeeds; keep CI as the strict syntax gate.
  if (
    result.error &&
    typeof result.error === "object" &&
    "code" in result.error &&
    result.error.code === "EPERM" &&
    result.status === 0
  ) {
    return null;
  }

  if (result.status !== 0) {
    return `${relativePath} failed node --check (${summarizeCommandFailure(result)})`;
  }

  return null;
}

function calculateFileHash(filePath: string): string {
  return `sha256:${createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")}`;
}

export function getC420UIBootstrapStatusWithDeps(
  rootDir: string,
  deps: C420UIBootstrapDeps,
): C420UIBootstrapStatus {
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const absolutePath = path.join(rootDir, relativePath);

    if (!fs.existsSync(absolutePath)) {
      return { state: "missing", reason: `${relativePath} is missing` };
    }

    let stats: fs.Stats;
    try {
      stats = fs.statSync(absolutePath);
    } catch (error) {
      return {
        state: "invalid",
        reason: `Failed to stat ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    if (!stats.isFile() || stats.size <= 0) {
      return { state: "missing", reason: `${relativePath} is empty` };
    }
  }

  const manifestPath = path.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH);
  const manifest = readJson<Record<string, unknown>>(manifestPath);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      state: "missing",
      reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} is missing or invalid`,
    };
  }

  const expectedSourceHash = deps.calculateSourceHash(rootDir);
  if (manifest.c420uiSourceHash !== expectedSourceHash) {
    return {
      state: "stale",
      reason: "c420uiSourceHash differs from current source tree",
    };
  }

  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    return {
      state: "invalid",
      reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} is missing artifactHashes`,
    };
  }

  const manifestArtifactHashes = artifactHashes as Record<string, unknown>;
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const expectedHash = manifestArtifactHashes[artifact];
    if (typeof expectedHash !== "string") {
      return {
        state: "invalid",
        reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} has invalid artifactHashes.${artifact}`,
      };
    }

    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const actualHash = calculateFileHash(path.join(rootDir, relativePath));
    if (actualHash !== expectedHash) {
      return {
        state: "stale",
        reason: `${relativePath} hash differs from ${C420UI_BOOTSTRAP_MANIFEST_PATH}`,
      };
    }
  }

  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const nodeCheckFailure = validateNodeCheck(rootDir, relativePath, deps);
    if (nodeCheckFailure) {
      return { state: "invalid", reason: nodeCheckFailure };
    }
  }

  return { state: "valid" };
}

export function getC420UIBootstrapStatus(rootDir: string): C420UIBootstrapStatus {
  return getC420UIBootstrapStatusWithDeps(rootDir, DEFAULT_DEPS);
}

export function ensureC420UIBootstrapWithDeps(
  rootDir: string,
  deps: C420UIBootstrapDeps,
): void {
  const status = getC420UIBootstrapStatusWithDeps(rootDir, deps);
  if (status.state === "valid") return;
  const bootstrapBuildRoot = resolveBootstrapBuildRoot(rootDir);

  console.error(`[c420ui] bootstrap ${status.state}: ${status.reason}`);
  console.error("[c420ui] generating bootstrap bundle automatically...");

  const result = deps.spawn("npm", ["run", "build:c420ui-bootstrap"], {
    cwd: bootstrapBuildRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    const details = result.error?.message || `exit status ${result.status ?? "unknown"}`;
    throw new Error(
      `Unable to generate c420ui bootstrap bundle automatically. ${details}`,
    );
  }

  const nextStatus = getC420UIBootstrapStatusWithDeps(rootDir, deps);
  if (nextStatus.state !== "valid") {
    throw new Error(
      `Generated c420ui bootstrap bundle is still invalid: ${nextStatus.reason}`,
    );
  }
}

export function ensureC420UIBootstrap(rootDir: string): void {
  ensureC420UIBootstrapWithDeps(rootDir, DEFAULT_DEPS);
}
