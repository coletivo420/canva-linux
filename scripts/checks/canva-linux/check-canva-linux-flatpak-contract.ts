#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const workflows = adapter.loadArtifactWorkflows();
  const flatpak = workflows.flatMap((workflow) => workflow.artifacts).find((artifact) => artifact.kind === "flatpak");
  const failures: string[] = [];
  if (capabilities.artifacts.flatpak !== "supported") failures.push("Flatpak capability must be supported");
  if (!flatpak) failures.push("Flatpak artifact recipe is required");
  if (flatpak && flatpak.actionId !== "bundle-flatpak") failures.push("Flatpak recipe must use bundle-flatpak action");
  if (flatpak && !flatpak.outputPattern?.includes(".flatpak")) failures.push("Flatpak recipe must declare flatpak output pattern");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-flatpak-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-flatpak-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
