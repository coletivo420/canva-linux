#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const workflows = adapter.loadArtifactWorkflows();
  const actions = new Set(adapter.loadActions().map((action) => action.id));
  const failures: string[] = [];

  for (const workflow of workflows) {
    if (!workflow.id || !workflow.label) failures.push("artifact workflows must have id and label");
    for (const artifact of workflow.artifacts) {
      if (artifact.actionId && !actions.has(artifact.actionId)) {
        failures.push(`${artifact.id}: action ${artifact.actionId} does not exist`);
      }
      if (!artifact.planned && !artifact.outputPattern) {
        failures.push(`${artifact.id}: concrete artifacts must declare outputPattern`);
      }
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-artifact-recipes] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-artifact-recipes] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
