#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const forbidden = [
  "Canva Linux",
  "CANVA LINUX",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "https://github.com/coletivo420/canva-linux",
  "CL-EyeDropper",
  "scripts/project-ui.json",
  "scripts/actions.json",
];

function readSource(rootDir: string): string {
  const srcDir = path.join(rootDir, "packages/c420ui/src");
  return fs
    .readdirSync(srcDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(srcDir, file), "utf8"))
    .join("\n");
}

export function main(): number {
  const rootDir = process.cwd();
  const source = readSource(rootDir);
  const failures = forbidden
    .filter((fragment) => source.includes(fragment))
    .map((fragment) => `packages/c420ui/src must not hardcode ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-boundary] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-boundary] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
