import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot } from "../project-root";

export function projectRoot(): string {
  return findCanvaLinuxProjectRoot(process.cwd());
}

export function ensurePathIsSafe(rootDir: string, targetPath: string): void {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(rootDir, targetPath);
  if (resolvedTarget === resolvedRoot || resolvedTarget === "/") {
    throw new Error(`Unsafe path deletion target: ${targetPath}`);
  }
  if (!resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes repository root: ${targetPath}`);
  }
}

export function exists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}
