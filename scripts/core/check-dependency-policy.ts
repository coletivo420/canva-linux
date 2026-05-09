import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../canva-linux/project-root";

const minimumDirectVersions: Record<string, string> = {
  electron: "41.5.0",
  "electron-builder": "26.8.1",
  eslint: "10.3.0",
};

const forbiddenDirectDependencies: Record<string, string> = {
  "eslint-plugin-import":
    "does not declare ESLint 10 support; adapt lint rules instead of downgrading ESLint",
};

function parseVersion(value: string | undefined): number[] | null {
  const match = String(value || "").match(/\d+(?:\.\d+){0,2}/);
  if (!match) return null;

  const parts = match[0].split(".").map((part) => Number(part));
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function compareVersions(left: number[], right: number[]): number {
  for (let i = 0; i < 3; i += 1) {
    if (left[i]! > right[i]!) return 1;
    if (left[i]! < right[i]!) return -1;
  }
  return 0;
}

export function main(): number {
  const rootDir = findProjectRoot();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  let failed = false;

  for (const [name, minimum] of Object.entries(minimumDirectVersions)) {
    const actualRange = allDeps[name];
    const actual = parseVersion(actualRange);
    const expected = parseVersion(minimum);

    if (
      !actualRange ||
      !actual ||
      !expected ||
      compareVersions(actual, expected) < 0
    ) {
      console.error(
        `[dependency-policy] ${name} must stay on >= ${minimum}; found ${actualRange || "missing"}`,
      );
      failed = true;
    }
  }

  for (const [name, reason] of Object.entries(forbiddenDirectDependencies)) {
    if (allDeps[name]) {
      console.error(`[dependency-policy] ${name} is forbidden: ${reason}`);
      failed = true;
    }
  }

  if (
    pkg.build?.beforeBuild !==
    "./.build/scripts/bootstrap/electron-builder-before-build.js"
  ) {
    console.error(
      "[dependency-policy] electron-builder beforeBuild hook must point at generated TypeScript output",
    );
    failed = true;
  }

  if (
    !fs.existsSync(
      path.join(rootDir, "scripts/electron-builder-before-build.ts"),
    )
  ) {
    console.error(
      "[dependency-policy] missing scripts/electron-builder-before-build.ts",
    );
    failed = true;
  }

  if (failed) return 1;
  console.log("[dependency-policy] OK");
  return 0;
}

if (
  require.main === module &&
  /check-dependency-policy\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[dependency-policy] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
