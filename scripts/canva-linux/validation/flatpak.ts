import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateFlatpakBrandingTokens } from "../flatpak/branding-policy";
import { validateFlatpakPermissions } from "../flatpak/permission-policy";
import { repoLintHasOnlyLocalScreenshotMirrorFindings } from "../flatpak/repo-lint-policy";
import { hasCommand } from "./optional-command";
import { validateRequiredFiles } from "./required-files";
import { failResult, okResult, type ValidationContext, type ValidationResult } from "./result";
import { runStep } from "./run-step";

function detectPackageVersion(rootDir: string): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")) as { version: string };
  return pkg.version;
}

function parseArgs(argv: string[]): { releaseArtifacts: boolean } {
  const releaseArtifacts = argv.includes("--release-artifacts");
  return { releaseArtifacts };
}

export function runFlatpakValidation(context: ValidationContext): ValidationResult {
  const warnings: string[] = [];
  const failures: string[] = [];
  const version = detectPackageVersion(context.rootDir);
  const bundlePath = path.join(context.rootDir, `dist/canva-linux-${version}.flatpak`);

  const requiredFiles = validateRequiredFiles(context.rootDir, [
    { path: "docs/SCREENSHOTS.md", label: "screenshot manifest" },
    { path: "docs/PRIVACY.md", label: "privacy documentation" },
    { path: "docs/notes/FLATHUB_CHECKLIST.md", label: "Flathub checklist" },
    { path: "docs/notes/FLATHUB_SOURCE.md", label: "Flathub source strategy documentation" },
    { path: "docs/FLATPAK_PERMISSIONS.md", label: "permission review documentation" },
    { path: "io.github.coletivo420.canva-linux.yml", label: "Flatpak manifest" },
    { path: "build-resources/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml", label: "AppStream metadata" },
    { path: "build-resources/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop", label: "desktop entry metadata" },
  ]);
  failures.push(...requiredFiles);

  const permissionCheck = validateFlatpakPermissions([
    path.join(context.rootDir, "io.github.coletivo420.canva-linux.yml"),
    path.join(context.rootDir, "build-resources/canva-linux/packaging/flathub/manifest.yml"),
  ]);
  failures.push(...permissionCheck.failures);

  const brandingFailures = validateFlatpakBrandingTokens([
    [path.join(context.rootDir, "io.github.coletivo420.canva-linux.yml"), "app-id: io.github.coletivo420.canva-linux"],
    [path.join(context.rootDir, "build-resources/canva-linux/packaging/flathub/manifest.yml"), "app-id: io.github.coletivo420.canva-linux"],
    [path.join(context.rootDir, "build-resources/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop"), "Name=Canva Linux"],
    [path.join(context.rootDir, "build-resources/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop"), "Comment=A community opensource desktop wrapper for use with Canva"],
    [path.join(context.rootDir, "build-resources/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml"), "<id>io.github.coletivo420.canva-linux</id>"],
    [path.join(context.rootDir, "build-resources/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml"), "<summary>A community opensource desktop wrapper for use with Canva</summary>"],
  ]);
  failures.push(...brandingFailures);

  if (hasCommand("desktop-file-validate")) {
    const r = runStep("desktop-file-validate", "desktop-file-validate", ["build-resources/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop"], context.rootDir);
    if (!r.ok) failures.push("desktop-file-validate failed");
  }

  if (hasCommand("appstreamcli")) {
    const r = runStep("appstreamcli validate --explain --no-net", "appstreamcli", ["validate", "--explain", "--no-net", "--override", "releases-not-in-order=info", "build-resources/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml"], context.rootDir);
    if (!r.ok) failures.push("appstreamcli validate failed");
  }

  if (hasCommand("flatpak") && (spawnSync("flatpak", ["info", "org.flatpak.Builder"], { cwd: context.rootDir }).status === 0 || spawnSync("flatpak", ["--user", "info", "org.flatpak.Builder"], { cwd: context.rootDir }).status === 0)) {
    const manifestLint = runStep("flatpak-builder-lint manifest", "flatpak", ["run", "--command=flatpak-builder-lint", "org.flatpak.Builder", "manifest", "io.github.coletivo420.canva-linux.yml"], context.rootDir);
    if (!manifestLint.ok) failures.push("flatpak-builder-lint manifest failed");

    if (fs.existsSync(path.join(context.rootDir, "repo"))) {
      const repoLintOutput = path.join(os.tmpdir(), `flatpak-repo-lint-${Date.now()}.json`);
      const repoLint = spawnSync("flatpak", ["run", "--command=flatpak-builder-lint", "org.flatpak.Builder", "repo", "repo"], {
        cwd: context.rootDir,
        encoding: "utf8",
        shell: false,
      });

      if (repoLint.status !== 0) {
        fs.writeFileSync(repoLintOutput, repoLint.stdout || repoLint.stderr || "", "utf8");
        if (!repoLintHasOnlyLocalScreenshotMirrorFindings(repoLintOutput)) {
          failures.push("flatpak-builder-lint repo failed");
        }
        fs.rmSync(repoLintOutput, { force: true });
      }
    }
  }

  if (context.releaseArtifacts) {
    if (!fs.existsSync(bundlePath)) {
      failures.push(`Bundle not found: ${bundlePath}`);
    }
  } else if (!fs.existsSync(bundlePath)) {
    warnings.push(`Bundle not found (expected for local install workflow): ${bundlePath}`);
  }

  if (failures.length > 0) return failResult(failures, warnings);
  return okResult(warnings);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const result = runFlatpakValidation({ rootDir: process.cwd(), releaseArtifacts: args.releaseArtifacts });
  process.exit(result.ok ? 0 : 1);
}
