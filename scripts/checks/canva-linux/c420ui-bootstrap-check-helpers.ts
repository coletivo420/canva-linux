import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { C420UI_BOOTSTRAP_BUILD_RECIPE } from "../../c420ui-adapter/bootstrap/build-recipe";

export const C420UI_BOOTSTRAP_ARTIFACTS = [
  "bootstrap/c420ui/run-c420ui.cjs",
  "bootstrap/c420ui/run-c420ui-cli.cjs",
  "bootstrap/c420ui/c420ui-builder.cjs",
] as const;

export function calculateFileHash(filePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")}`;
}

function summarizeCommandFailure(result: ReturnType<typeof spawnSync>): string {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}

export function validateManifestArtifactHashes(params: {
  rootDir: string;
  manifest: Record<string, unknown>;
  manifestPath?: string;
  failures: string[];
}): void {
  const { rootDir, manifest, failures } = params;
  const manifestPath = params.manifestPath ?? "bootstrap/c420ui/manifest.json";

  if (manifest.generatedBy !== C420UI_BOOTSTRAP_BUILD_RECIPE) {
    failures.push(`${manifestPath}: generatedBy must be ${C420UI_BOOTSTRAP_BUILD_RECIPE}`);
  }

  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    failures.push(`${manifestPath}: artifactHashes must record generated bootstrap artifact hashes`);
    return;
  }

  const hashes = artifactHashes as Record<string, unknown>;
  for (const relativePath of C420UI_BOOTSTRAP_ARTIFACTS) {
    const artifact = path.basename(relativePath);
    const expectedHash = hashes[artifact];
    if (typeof expectedHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
      failures.push(`${manifestPath}: artifactHashes.${artifact} must be a sha256 hash`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;

    const actualHash = calculateFileHash(path.join(rootDir, relativePath));
    if (actualHash !== expectedHash) {
      failures.push(`${relativePath}: artifact hash differs from ${manifestPath}; regenerate bootstrap from TypeScript sources`);
    }
  }
}

export function runNodeCheck(params: {
  rootDir: string;
  relativePath: string;
  failures: string[];
}): void {
  const { rootDir, relativePath, failures } = params;
  const absolutePath = path.join(rootDir, relativePath);
  const result = spawnSync(process.execPath, ["--check", absolutePath], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    failures.push(
      `${relativePath}: c420ui bootstrap bundle failed syntax validation. Regenerate bootstrap from TypeScript sources. (${summarizeCommandFailure(result)})`,
    );
  }
}
