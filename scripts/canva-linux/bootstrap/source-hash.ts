import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM = "sha256" as const;

export const C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS = [
  "packages/c420ui/src",
  "scripts/c420ui-adapter",
  "scripts/canva-linux",
  "scripts/run-c420ui.ts",
  "scripts/run-c420ui-cli.ts",
  "scripts/c420ui-builder.ts",
  "canva-linux-c420ui-builder",
  "scripts/build-c420ui-bootstrap.ts",
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

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function shouldIgnore(relativePath: string): boolean {
  return normalizeRelativePath(relativePath)
    .split(path.posix.sep)
    .some((part) => IGNORED_PATH_PARTS.has(part));
}

function collectFiles(rootDir: string, relativeInput: string): string[] {
  if (shouldIgnore(relativeInput)) return [];

  const absoluteInput = path.join(rootDir, relativeInput);
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
