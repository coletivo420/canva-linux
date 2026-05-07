#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export function main(): number {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "packages/c420ui/src");
  const failures: string[] = [];
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".ts")) continue;
    if (!/^[a-z0-9-]+\.ts$/.test(file)) failures.push(`${file}: source file names must be kebab-case`);
  }
  const expected = [
    "actions.ts",
    "artifacts.ts",
    "bridge.ts",
    "capabilities.ts",
    "events.ts",
    "exit-codes.ts",
    "workflows.ts",
  ];
  for (const file of expected) {
    if (!fs.existsSync(path.join(srcDir, file))) failures.push(`missing ${file}`);
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-naming] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-naming] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
