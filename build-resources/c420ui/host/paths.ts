import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./project-root";

const CANVA_LINUX_PROJECT_MARKERS = [
  "package.json",
  "build-resources/canva-linux/config/actions.json",
];

export function projectRoot(): string {
  return findProjectRoot(process.cwd(), CANVA_LINUX_PROJECT_MARKERS);
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
