import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  c420uiBootstrapArtifactPath,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
} from "./bootstrap-check-helpers.js";
import { runC420UIRustBootstrapCheck } from "../src/rust-bootstrap.js";

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function calculateFileHash(rootDir: string, relativePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(path.join(rootDir, relativePath)))
    .digest("hex")}`;
}

export function validateManifestArtifactHashes(
  rootDir: string,
  manifest: Record<string, unknown>,
  failures: string[],
): void {
  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: artifactHashes must record generated bootstrap artifact hashes`);
    return;
  }

  const hashes = artifactHashes as Record<string, unknown>;
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const expectedHash = hashes[artifact];
    if (typeof expectedHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
      failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: artifactHashes.${artifact} must be a sha256 hash`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;

    const actualHash = calculateFileHash(rootDir, relativePath);
    if (actualHash !== expectedHash) {
      failures.push(`${relativePath}: artifact hash differs from ${C420UI_BOOTSTRAP_MANIFEST_PATH}; regenerate bootstrap with c420ui-host bootstrap`);
    }
  }
}

async function main(): Promise<void> {
  const rootDir = findProjectRoot();
  const output = await runC420UIRustBootstrapCheck({
    rootDir,
    bootstrapOutDir:
      process.env.C420UI_BOOTSTRAP_OUT_DIR ??
      "build-resources/c420ui/bootstrap/generated",
    projectConfigRoot:
      process.env.C420UI_PROJECT_CONFIG_ROOT ??
      "build-resources/canva-linux/config",
    buildMetadataPath:
      process.env.C420UI_BUILD_METADATA_PATH ??
      "build-resources/canva-linux/config/build-metadata.json",
  });
  if (!output.ok) {
    throw new Error(
      output.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n") ||
        "c420ui-host bootstrap-check failed",
    );
  }
}

if (/check-bootstrap\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
