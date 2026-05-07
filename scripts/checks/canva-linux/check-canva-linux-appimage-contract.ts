#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const workflows = adapter.loadArtifactWorkflows();
  const appImage = workflows.flatMap((workflow) => workflow.artifacts).find((artifact) => artifact.kind === "appimage");
  const failures: string[] = [];
  if (capabilities.artifacts.appimage !== "supported") failures.push("AppImage capability must be supported");
  if (!appImage) failures.push("AppImage artifact recipe is required");
  if (appImage && appImage.actionId !== "bundle-appimage") failures.push("AppImage recipe must use bundle-appimage action");
  if (appImage && !appImage.outputPattern?.includes(".AppImage")) failures.push("AppImage recipe must declare AppImage output pattern");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-appimage-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-appimage-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
