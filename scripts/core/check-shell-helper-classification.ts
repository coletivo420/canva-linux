#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(rootDir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function forbid(
  failures: string[],
  label: string,
  content: string,
  fragment: string,
): void {
  if (content.includes(fragment)) failures.push(`${label} must not contain ${fragment}`);
}

function requireText(
  failures: string[],
  label: string,
  content: string,
  fragment: string,
): void {
  if (!content.includes(fragment)) failures.push(`${label} must document ${fragment}`);
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const preflight = read(rootDir, "scripts/preflight-common.sh");
  const classification = read(rootDir, "docs/checks/SHELL_HELPER_CLASSIFICATION.md");
  const processRunner = read(rootDir, "scripts/c420ui/process-runner.ts");
  const actionRunner = read(rootDir, "scripts/core/action-runner.ts");
  const runC420ui = read(rootDir, "scripts/run-c420ui.ts");

  const obsoleteScript = ["scripts", ["ensure", "npm", "dependencies.sh"].join("-")].join("/");
  if (exists(rootDir, obsoleteScript)) {
    failures.push(`${obsoleteScript} must not exist`);
  }

  const obsoleteFunction = ["ensure", "npm", "dependencies"].join("_");
  const obsoleteEnvFragments = [
    ["CANVA", "REQUIRED", "NPM", "DEPS"].join("_"),
    ["CANVA", "SKIP", "NPM", "INSTALL"].join("_"),
    ["CANVA", "NPM", "REPAIR"].join("_"),
  ];

  forbid(failures, "scripts/preflight-common.sh", preflight, obsoleteFunction);
  forbid(failures, "scripts/preflight-common.sh", preflight, "npm ci");
  forbid(failures, "scripts/preflight-common.sh", preflight, "npm install");
  for (const fragment of obsoleteEnvFragments) {
    forbid(failures, "scripts/preflight-common.sh", preflight, fragment);
  }

  for (const required of [
    "require_command()",
    "validate_json_file()",
    "validate_package_scripts()",
    "detect_package_version()",
    "validate_package_version_semver()",
  ]) {
    requireText(failures, "scripts/preflight-common.sh", preflight, required);
  }

  for (const helper of [
    "repository-check-only",
    "scripts/preflight-common.sh",
    "scripts/build-appimage.sh",
    "scripts/build-flatpak-bundle.sh",
    "scripts/package-guidance-common.sh",
    "scripts/validate-project.sh",
    "scripts/validate-appimage.sh",
    "scripts/build-electron-dir.sh",
  ]) {
    requireText(failures, "docs/checks/SHELL_HELPER_CLASSIFICATION.md", classification, helper);
  }

  forbid(failures, "scripts/c420ui/process-runner.ts", processRunner, "context.dryRun");
  forbid(failures, "scripts/c420ui/process-runner.ts", processRunner, "action.kind === \"planned\"");
  forbid(failures, "scripts/c420ui/process-runner.ts", processRunner, "Transitional bridge execution path");
  forbid(failures, "scripts/c420ui/process-runner.ts", processRunner, "Defensive fallback only");
  requireText(failures, "scripts/c420ui/process-runner.ts", processRunner, "spawn(command, args");
  requireText(failures, "scripts/core/action-runner.ts", actionRunner, "--dry-run");
  requireText(failures, "scripts/core/action-runner.ts", actionRunner, "action.kind === \"planned\"");
  forbid(failures, "scripts/run-c420ui.ts", runC420ui, obsoleteScript);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[shell-helper-classification] OK");
  return 0;
}

if (
  require.main === module &&
  /check-shell-helper-classification\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[shell-helper-classification] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
