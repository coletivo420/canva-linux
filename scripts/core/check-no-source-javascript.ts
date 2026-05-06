import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

const allowedJavaScriptRoots = [
  ".build/",
  "node_modules/",
  "coverage/",
  "dist/",
] as const;

const allowedGeneratedJavaScriptFiles = new Set([
  "electron/preload/canva.bundle.js",
]);

const skippedDirectories = new Set([
  ".git",
  ".build",
  "node_modules",
  "coverage",
  "dist",
]);

const explicitlyBlockedJavaScript = [
  /^scripts\/.+\.js$/,
  /^test\/.+\.js$/,
  /^packaging\/flathub\/scripts\/.+\.js$/,
  /^eslint\.config\.js$/,
  /^playwright\.config\.js$/,
] as const;

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, "/");
}

function isAllowedJavaScript(relativePath: string): boolean {
  return (
    allowedGeneratedJavaScriptFiles.has(relativePath) ||
    allowedJavaScriptRoots.some((prefix) => relativePath.startsWith(prefix))
  );
}

function isExplicitlyBlocked(relativePath: string): boolean {
  return explicitlyBlockedJavaScript.some((pattern) =>
    pattern.test(relativePath),
  );
}

function collectJavaScriptFiles(
  rootDir: string,
  directory: string,
  output: string[],
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return;
    throw error;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRelative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      if (skippedDirectories.has(relativePath)) continue;
      collectJavaScriptFiles(rootDir, absolutePath, output);
      continue;
    }

    if (entry.isFile() && relativePath.endsWith(".js"))
      output.push(relativePath);
  }
}

function findForbiddenJavaScript(rootDir: string): string[] {
  const files: string[] = [];
  collectJavaScriptFiles(rootDir, rootDir, files);
  return files
    .filter((file) => !isAllowedJavaScript(file))
    .sort((left, right) => left.localeCompare(right));
}

function formatFailure(file: string): string {
  const reason = isExplicitlyBlocked(file)
    ? "explicitly blocked JavaScript source"
    : "JavaScript source outside generated/dependency output";
  return `${file}: ${reason}; migrate maintained Node.js source to TypeScript`;
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures = findForbiddenJavaScript(rootDir);

  if (failures.length) {
    console.error("[no-source-javascript] FAILED:");
    for (const failure of failures)
      console.error(`- ${formatFailure(failure)}`);
    return 1;
  }

  console.log(
    "[ok] no source JavaScript files found outside allowed generated/dependency directories",
  );
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[no-source-javascript] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
