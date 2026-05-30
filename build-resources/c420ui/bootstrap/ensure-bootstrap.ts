import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateC420UISourceHash } from "./source-hash";
import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
  c420uiBootstrapArtifactPath,
} from "../checks/bootstrap-check-helpers";

export type C420UIBootstrapStatus =
  | { state: "valid" }
  | { state: "missing"; reason: string }
  | { state: "stale"; reason: string }
  | { state: "invalid"; reason: string };

export type C420UIBootstrapDeps = {
  calculateSourceHash: (rootDir: string) => string;
  spawn: typeof spawnSync;
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

  if (result.error || result.status !== 0) {
    return `${relativePath} failed node --check (${summarizeCommandFailure(result)})`;
  }

  return null;
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

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile() || stats.size <= 0) {
      return { state: "missing", reason: `${relativePath} is empty` };
    }
  }

  const manifestPath = path.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH);
  const manifest = readJson<Record<string, unknown>>(manifestPath);
  if (!manifest) {
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

  console.error(`[c420ui] bootstrap ${status.state}: ${status.reason}`);
  console.error("[c420ui] generating bootstrap bundle automatically...");

  const result = deps.spawn("npm", ["run", "build:c420ui-bootstrap"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error || result.status !== 0) {
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
