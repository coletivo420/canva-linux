import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SOURCE_HASH_ALGORITHM = "sha256" as const;

const DEFAULT_IGNORED_PATH_PARTS = new Set([
  ".git",
  ".build",
  "dist",
  "node_modules",
]);

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function shouldIgnore(relativePath: string, ignoredRelativePaths: ReadonlySet<string>): boolean {
  const normalized = normalizeRelativePath(relativePath);

  for (const ignoredPath of ignoredRelativePaths) {
    if (normalized === ignoredPath || normalized.startsWith(`${ignoredPath}/`)) {
      return true;
    }
  }

  return normalized
    .split(path.posix.sep)
    .some((part) => DEFAULT_IGNORED_PATH_PARTS.has(part));
}

function collectFiles(
  rootDir: string,
  relativeInput: string,
  ignoredRelativePaths: ReadonlySet<string>,
): string[] {
  if (shouldIgnore(relativeInput, ignoredRelativePaths)) return [];

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
      if (shouldIgnore(relativePath, ignoredRelativePaths)) continue;

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

export function collectSourceHashFiles(
  rootDir: string,
  inputs: readonly string[],
  ignores: readonly string[] = [],
): string[] {
  const ignoredRelativePaths = new Set(ignores.map((value) => normalizeRelativePath(value)));
  return [...new Set(inputs.flatMap((input) => collectFiles(rootDir, input, ignoredRelativePaths)))]
    .sort((left, right) => left.localeCompare(right));
}

export function calculateSourceHash(
  rootDir: string,
  inputs: readonly string[],
  ignores: readonly string[] = [],
): string {
  const hash = crypto.createHash(SOURCE_HASH_ALGORITHM);

  for (const relativePath of collectSourceHashFiles(rootDir, inputs, ignores)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(rootDir, relativePath)));
    hash.update("\0");
  }

  return `${SOURCE_HASH_ALGORITHM}:${hash.digest("hex")}`;
}

export function combineSourceHashes(canvaLinuxHash?: string, c420uiHash?: string): string {
  const left = canvaLinuxHash || "unknown";
  const right = c420uiHash || "unknown";
  const hash = crypto.createHash(SOURCE_HASH_ALGORITHM);

  hash.update("canva-linux");
  hash.update("\0");
  hash.update(left);
  hash.update("\0");
  hash.update("c420ui");
  hash.update("\0");
  hash.update(right);

  return `${SOURCE_HASH_ALGORITHM}:${hash.digest("hex")}`;
}

export const CANVA_LINUX_SOURCE_HASH_INPUTS = [
  "build-resources/electron",
  "build-resources/canva-linux",
  "build-resources/canva-linux/c420ui-adapter",
  "build-resources/canva-linux/config",
  "build-resources/canva-linux/assets",
  "io.github.coletivo420.canva-linux.yml",
  "package.json",
  "package-lock.json",
] as const;

export const CANVA_LINUX_SOURCE_HASH_IGNORES = [
  "build-resources/canva-linux/config/build-metadata.json",
  "build-resources/tests",
  "docs",
  "build-resources/c420ui",
  "build-resources/c420ui/bootstrap/generated",
] as const;

export function calculateCanvaLinuxSourceHash(
  rootDir: string,
  inputs: readonly string[] = CANVA_LINUX_SOURCE_HASH_INPUTS,
  ignores: readonly string[] = CANVA_LINUX_SOURCE_HASH_IGNORES,
): string {
  return calculateSourceHash(rootDir, inputs, ignores);
}
