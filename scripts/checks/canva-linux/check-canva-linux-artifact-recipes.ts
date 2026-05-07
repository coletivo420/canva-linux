#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const workflows = adapter.loadArtifactWorkflows();
  const actions = new Set(adapter.loadActions().map((action) => action.id));
  const failures: string[] = [];

  for (const workflow of workflows) {
    if (!workflow.id || !workflow.label) failures.push("artifact workflows must have id and label");
    const actionIds = [
      workflow.buildActionId,
      workflow.validateActionId,
      workflow.installActionId,
      workflow.uninstallActionId,
      workflow.purgeActionId,
      workflow.releaseActionId,
    ].filter((id): id is string => Boolean(id));
    for (const actionId of actionIds) {
      if (actionId !== "release-artifacts" && !actions.has(actionId)) {
        failures.push(`${workflow.id}: action ${actionId} does not exist`);
      }
    }
    if (!workflow.planned && workflow.kind !== "native" && !("outputPattern" in workflow)) {
      failures.push(`${workflow.id}: concrete packaged artifacts must declare outputPattern`);
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
