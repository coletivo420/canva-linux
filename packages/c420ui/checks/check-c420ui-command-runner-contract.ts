#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const runner = read(rootDir, "packages/c420ui/src/command-runner.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const adapter = read(rootDir, "scripts/c420ui-canva-linux/adapter.ts");
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const failures: string[] = [];

  for (const fragment of [
    "runC420UICommand",
    "c420uiCommandRunnerOptions",
    "StringDecoder",
    "emitLog",
    "emitProgress",
    "shell: false",
    'stdio: ["ignore", "pipe", "pipe"]',
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`command runner must include contract fragment: ${fragment}`);
    }
  }

  if (!index.includes('export { runC420UICommand } from "./command-runner"')) {
    failures.push("index must export runC420UICommand");
  }
  if (!index.includes('export type { c420uiCommandRunnerOptions } from "./command-runner"')) {
    failures.push("index must export c420uiCommandRunnerOptions");
  }
  if (!adapter.includes("runC420UICommand({")) {
    failures.push("Canva Linux adapter must delegate command execution to runC420UICommand");
  }
  if (adapter.includes("spawn(")) {
    failures.push("Canva Linux adapter must not reimplement generic spawn handling");
  }
  if (app.includes('from "./process-runner"') || app.includes("from './process-runner'")) {
    failures.push("interactive app must not import ./process-runner");
  }
  if (fs.existsSync(path.join(rootDir, "scripts/c420ui/process-runner.ts"))) {
    failures.push("scripts/c420ui/process-runner.ts must not exist after command runner migration");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-command-runner-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-command-runner-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
