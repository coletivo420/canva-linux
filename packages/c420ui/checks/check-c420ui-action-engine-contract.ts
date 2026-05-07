#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const actionEngine = read(rootDir, "packages/c420ui/src/action-engine.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const required = [
    "createC420UIActionEngine",
    "resolveActionById",
    "resolveActionByCliFlag",
    "runActionById",
    "runAction",
    "bridge.runAction",
    "c420uiExitCodes.plannedAction",
    "c420uiExitCodes.success",
    "isC420UIPlannedAction",
    "dryRun",
    "requiresC420UIActionConfirmation",
    "Action requires confirmation",
  ];
  const forbidden = [
    "Canva Linux",
    "canva-linux",
    "io.github.coletivo420.canva-linux",
    "project-ui.json",
    "scripts/actions.json",
  ];
  const failures = [
    ...required
      .filter((fragment) => !actionEngine.includes(fragment))
      .map((fragment) => `missing action engine contract fragment: ${fragment}`),
    ...forbidden
      .filter((fragment) => actionEngine.includes(fragment))
      .map((fragment) => `action engine must not contain project-specific fragment: ${fragment}`),
  ];

  if (!index.includes('export { createC420UIActionEngine } from "./action-engine"')) {
    failures.push("index must export createC420UIActionEngine");
  }
  if (!index.includes('} from "./action-engine"')) {
    failures.push("index must export action engine types");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-action-engine-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-action-engine-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
