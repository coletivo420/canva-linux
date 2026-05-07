#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const failures: string[] = [];
  const project = adapter.projectInfo();
  const capabilities = adapter.loadCapabilities();
  if (adapter.id !== "canva-linux") failures.push("adapter id must identify the project adapter");
  if (!project.projectName) failures.push("adapter must load project name");
  if (!project.appId) failures.push("adapter must load app id");
  if (!adapter.actions().length) failures.push("adapter must expose concrete actions through the generic bridge");
  if (!adapter.loadWorkflows().length) failures.push("adapter must expose c420ui workflows");
  if (!adapter.artifactWorkflows().length) failures.push("adapter must expose artifact workflows through the generic bridge");
  if (capabilities.supportsRootActions !== true) failures.push("adapter must declare root action support");
  if (capabilities.supportsDryRun !== true) failures.push("adapter must declare dry-run support");
  if (typeof adapter.runAction !== "function") failures.push("adapter must implement runAction");

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
