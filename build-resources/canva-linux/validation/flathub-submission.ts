import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateFlatpakBrandingTokens } from "../packaging/flatpak/branding-policy.js";
import { validateFlatpakPermissions } from "../packaging/flatpak/permission-policy.js";
import { validateGeneratedSources } from "../packaging/flathub/policy/generated-sources-policy.js";
import { extractArchiveSha256, extractArchiveUrl, readManifest, validateSubmissionManifestTokens } from "../packaging/flathub/policy/submission-policy.js";
import { verifyArchiveSha256 } from "../packaging/flathub/policy/source-archive-policy.js";
import { hasCommand } from "./optional-command.js";
import { failResult, okResult, type ValidationContext, type ValidationResult } from "./result.js";
import { runStep } from "./run-step.js";

export function runFlathubSubmissionValidation(context: ValidationContext): ValidationResult {
  const warnings: string[] = [];
  const failures: string[] = [];

  const manifestPath = path.join(context.rootDir, "build-resources/canva-linux/packaging/flathub/manifest.yml");
  const generatedSourcesPath = path.join(context.rootDir, "build-resources/canva-linux/packaging/flathub/generated-sources.json");

  if (!fs.existsSync(manifestPath)) failures.push(`Missing submission manifest: ${manifestPath}`);
  if (!fs.existsSync(generatedSourcesPath)) failures.push(`Missing npm dependency manifest: ${generatedSourcesPath}`);
  if (failures.length > 0) return failResult(failures, warnings);

  const manifest = readManifest(manifestPath);
  failures.push(...validateSubmissionManifestTokens(manifest));

  const archiveUrl = extractArchiveUrl(manifest);
  const archiveSha256 = extractArchiveSha256(manifest);
  if (!archiveUrl) failures.push("Unable to find archive url in submission manifest");
  if (!archiveSha256) failures.push("Unable to find sha256 in submission manifest");

  failures.push(...validateGeneratedSources(generatedSourcesPath));

  const permissionCheck = validateFlatpakPermissions([
    path.join(context.rootDir, "io.github.coletivo420.canva-linux.yml"),
    manifestPath,
  ]);
  failures.push(...permissionCheck.failures);

  failures.push(...validateFlatpakBrandingTokens([
    [path.join(context.rootDir, "io.github.coletivo420.canva-linux.yml"), "app-id: io.github.coletivo420.canva-linux"],
    [manifestPath, "app-id: io.github.coletivo420.canva-linux"],
  ]));

  if (archiveUrl && archiveSha256 && hasCommand("curl") && hasCommand("sha256sum") && hasCommand("tar")) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flathub-src-"));
    const archivePath = path.join(tmpDir, "source.tar.gz");
    const curl = runStep("download source archive", "curl", ["-L", "--fail", "--silent", "--show-error", archiveUrl, "-o", archivePath], context.rootDir);
    if (!curl.ok) {
      failures.push("failed to download archive");
    } else {
      const hashFailure = verifyArchiveSha256(archivePath, archiveSha256, context.rootDir);
      if (hashFailure) failures.push(hashFailure);
      const untar = runStep("extract source archive", "tar", ["-xzf", archivePath, "-C", tmpDir], context.rootDir);
      if (!untar.ok) failures.push("failed to extract archive");
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  if (hasCommand("flatpak") && (spawnSync("flatpak", ["info", "org.flatpak.Builder"], { cwd: context.rootDir }).status === 0 || spawnSync("flatpak", ["--user", "info", "org.flatpak.Builder"], { cwd: context.rootDir }).status === 0)) {
    const repoDir = path.join(context.rootDir, "repo");
    fs.rmSync(repoDir, { recursive: true, force: true });

    const flathubBuild = runStep("flathub-build", "flatpak", ["run", "--command=flathub-build", "org.flatpak.Builder", `--repo=${repoDir}`, "build-resources/canva-linux/packaging/flathub/manifest.yml"], context.rootDir);
    if (!flathubBuild.ok) failures.push("flathub-build failed");

    const manifestLint = runStep("flatpak-builder-lint manifest", "flatpak", ["run", "--command=flatpak-builder-lint", "org.flatpak.Builder", "manifest", "build-resources/canva-linux/packaging/flathub/manifest.yml"], context.rootDir);
    if (!manifestLint.ok) failures.push("flatpak-builder-lint manifest failed");

    if (fs.existsSync(repoDir)) {
      const repoLint = runStep("flatpak-builder-lint repo", "flatpak", ["run", "--command=flatpak-builder-lint", "org.flatpak.Builder", "repo", "repo"], context.rootDir);
      if (!repoLint.ok) failures.push("flatpak-builder-lint repo failed");
    }
  } else {
    warnings.push("org.flatpak.Builder not installed; skipping flathub-build and lint checks");
  }

  if (failures.length > 0) return failResult(failures, warnings);
  return okResult(warnings);
}

if (/flathub-submission\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  const result = runFlathubSubmissionValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}
