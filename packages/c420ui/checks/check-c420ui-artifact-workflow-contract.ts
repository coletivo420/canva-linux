#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const artifacts = read(rootDir, "packages/c420ui/src/artifacts.ts");
  const workflows = read(rootDir, "packages/c420ui/src/workflows.ts");
  const required = [
    "c420uiArtifactKind",
    "c420uiArtifactScope",
    "c420uiArtifactWorkflow",
    "buildActionId",
    "validateActionId",
    "installActionId",
    "uninstallActionId",
    "purgeActionId",
    "releaseActionId",
    "custom",
    "runC420UIWorkflow",
  ];
  const source = `${artifacts}\n${workflows}`;
  const failures = required
    .filter((fragment) => !source.includes(fragment))
    .map((fragment) => `missing artifact/workflow contract fragment: ${fragment}`);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-artifact-workflow-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-artifact-workflow-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
