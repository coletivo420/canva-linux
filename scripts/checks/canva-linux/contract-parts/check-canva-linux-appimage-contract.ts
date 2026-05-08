#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const appImage = adapter.loadArtifactWorkflows().find((workflow) => workflow.kind === "appimage");
  const failures: string[] = [];
  if (capabilities.supportsArtifacts !== true) failures.push("artifact capability must be supported");
  if (!appImage) failures.push("AppImage artifact workflow is required");
  if (appImage && appImage.buildActionId !== "bundle-appimage") failures.push("AppImage workflow must use bundle-appimage action");
  if (appImage && appImage.validateActionId !== "validate-appimage") failures.push("AppImage workflow must use validate-appimage action");
  if (appImage && !("outputPattern" in appImage) || ("outputPattern" in (appImage ?? {}) && !String((appImage as { outputPattern?: string }).outputPattern).includes(".AppImage"))) {
    failures.push("AppImage workflow must declare AppImage output pattern");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-appimage-contract] OK");
  return 0;
}
