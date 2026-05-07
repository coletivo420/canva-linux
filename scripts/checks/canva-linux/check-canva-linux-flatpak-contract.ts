#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const capabilities = adapter.loadCapabilities();
  const flatpak = adapter.loadArtifactWorkflows().find((workflow) => workflow.kind === "flatpak");
  const failures: string[] = [];
  if (capabilities.supportsArtifacts !== true) failures.push("artifact capability must be supported");
  if (!flatpak) failures.push("Flatpak artifact workflow is required");
  if (flatpak && flatpak.buildActionId !== "bundle-flatpak") failures.push("Flatpak workflow must use bundle-flatpak action");
  if (flatpak && flatpak.validateActionId !== "validate-project") failures.push("Flatpak workflow must use validate-project action");
  if (flatpak && !("outputPattern" in flatpak) || ("outputPattern" in (flatpak ?? {}) && !String((flatpak as { outputPattern?: string }).outputPattern).includes(".flatpak"))) {
    failures.push("Flatpak workflow must declare flatpak output pattern");
  }

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
