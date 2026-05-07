#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const failures: string[] = [];
  const project = adapter.loadProjectInfo();
  if (adapter.id !== "canva-linux") failures.push("adapter id must identify the project adapter");
  if (!project.projectName) failures.push("adapter must load project name");
  if (!project.appId) failures.push("adapter must load app id");
  if (!adapter.loadActions().length) failures.push("adapter must expose concrete actions");
  if (!adapter.loadWorkflows().length) failures.push("adapter must expose c420ui workflows");
  if (!adapter.loadArtifactWorkflows().length) failures.push("adapter must expose artifact workflows");
  if (adapter.loadCapabilities().sudoProvider !== "supported") failures.push("adapter must declare privilege provider support");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-adapter-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-adapter-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
