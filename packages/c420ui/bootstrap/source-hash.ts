import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM = "sha256" as const;

export const C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS = [
  "packages/c420ui/src",
  "packages/c420ui/bootstrap",
  "packages/c420ui/scripts",
  "packages/c420ui/checks",
  "packages/c420ui/test",
  "scripts/c420ui-adapter",
  "scripts/canva-linux/actions",
  "scripts/canva-linux/artifacts",
  "scripts/canva-linux/capabilities",
  "scripts/canva-linux/development",
  "scripts/canva-linux/project-root.ts",
  "packages/c420ui/scripts/run-c420ui.ts",
  "packages/c420ui/scripts/run-c420ui-cli.ts",
  "packages/c420ui/scripts/c420ui-builder.ts",
  "canva-linux-c420ui-builder",
  "packages/c420ui/scripts/build-bootstrap.ts",
  "config/canva-linux",
  "packages/c420ui/package.json",
  "package.json",
] as const;

const IGNORED_PATH_PARTS = new Set([
  ".git",
  ".build",
  "dist",
  "node_modules",
]);

const IGNORED_RELATIVE_PATHS = new Set([
  "packages/c420ui/bootstrap/generated",
]);

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function shouldIgnore(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  for (const ignoredPath of IGNORED_RELATIVE_PATHS) {
    if (normalized === ignoredPath || normalized.startsWith(`${ignoredPath}/`)) {
      return true;
    }
  }

  return normalized
    .split(path.posix.sep)
    .some((part) => IGNORED_PATH_PARTS.has(part));
}

function collectFiles(rootDir: string, relativeInput: string): string[] {
  if (shouldIgnore(relativeInput)) return [];

  const absoluteInput = path.join(rootDir, relativeInput);
  if (!fs.existsSync(absoluteInput)) return [];
  const stats = fs.statSync(absoluteInput);

  if (stats.isFile()) return [normalizeRelativePath(relativeInput)];
  if (!stats.isDirectory()) return [];

  const files: string[] = [];
  const walk = (relativeDirectory: string): void => {
    const entries = fs
      .readdirSync(path.join(rootDir, relativeDirectory), { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relativePath = normalizeRelativePath(path.join(relativeDirectory, entry.name));
      if (shouldIgnore(relativePath)) continue;

      if (entry.isDirectory()) {
        walk(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };

  walk(relativeInput);
  return files;
}

export function collectC420UIBootstrapSourceHashFiles(
  rootDir: string,
  inputs: readonly string[] = C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
): string[] {
  return [...new Set(inputs.flatMap((input) => collectFiles(rootDir, input)))]
    .sort((left, right) => left.localeCompare(right));
}

export function calculateC420UIBootstrapSourceHash(
  rootDir: string,
  inputs: readonly string[] = C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
): string {
  const hash = crypto.createHash(C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM);

  for (const relativePath of collectC420UIBootstrapSourceHashFiles(rootDir, inputs)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(rootDir, relativePath)));
    hash.update("\0");
  }

  return `${C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM}:${hash.digest("hex")}`;
}
