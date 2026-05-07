#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  private?: boolean;
  name?: string;
  type?: string;
  main?: string;
  types?: string;
};

export function main(): number {
  const rootDir = process.cwd();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "packages/c420ui/package.json"), "utf8"),
  ) as PackageJson;
  const failures: string[] = [];
  if (pkg.name !== "@coletivo420/c420ui") failures.push("package name must remain scoped");
  if (pkg.private !== true) failures.push("package must remain private");
  if (pkg.type !== "commonjs") failures.push("package must remain CommonJS-compatible");
  if (pkg.main !== "dist/index.js") failures.push("package main must point to dist/index.js");
  if (pkg.types !== "dist/index.d.ts") failures.push("package types must point to dist/index.d.ts");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-package-policy] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-package-policy] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
