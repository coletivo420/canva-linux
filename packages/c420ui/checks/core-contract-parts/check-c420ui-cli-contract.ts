#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const cli = read(rootDir, "packages/c420ui/src/cli.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const required = [
    "runC420UICli",
    "c420uiCliOptions",
    "c420uiCliResult",
    "Only one direct action can be executed per invocation",
    "resolveActionByCliFlag",
    "Unknown option",
  ];
  const forbidden = [
    "Canva Linux",
    "canva-linux",
    "--doctor",
    "--bundle-appimage",
    "--purge",
  ];
  const failures = [
    ...required
      .filter((fragment) => !cli.includes(fragment))
      .map((fragment) => `missing c420ui CLI contract fragment: ${fragment}`),
    ...forbidden
      .filter((fragment) => cli.includes(fragment))
      .map((fragment) => `generic c420ui CLI must not contain project-specific fragment: ${fragment}`),
  ];

  if (!index.includes('export { runC420UICli } from "./cli"')) {
    failures.push("index must export runC420UICli");
  }
  if (!index.includes('export type { c420uiCliOptions, c420uiCliResult } from "./cli"')) {
    failures.push("index must export c420ui CLI types");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-cli-contract] OK");
  return 0;
}
