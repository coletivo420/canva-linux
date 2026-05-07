#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const releaseWorkflows = adapter.loadArtifactWorkflows().filter((workflow) => workflow.scope === "release");
  const failures: string[] = [];
  if (!releaseWorkflows.length) failures.push("release artifact workflows are required");
  const outputPatterns = releaseWorkflows.map((workflow) => ("outputPattern" in workflow ? String(workflow.outputPattern ?? "") : ""));
  for (const expected of ["linux-unpacked-*.tar.gz", "SHA256SUMS"]) {
    if (!outputPatterns.some((pattern) => pattern.includes(expected))) {
      failures.push(`release artifacts must include ${expected}`);
    }
  }
  const releaseLinked = adapter.loadArtifactWorkflows().filter((workflow) => workflow.releaseActionId === "release-artifacts");
  if (!releaseLinked.some((workflow) => workflow.kind === "appimage")) failures.push("release must include AppImage workflow");
  if (!releaseLinked.some((workflow) => workflow.kind === "flatpak")) failures.push("release must include Flatpak workflow");
  if (adapter.loadCapabilities().supportsRelease !== true) failures.push("release capability must be supported");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-release-artifacts] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-release-artifacts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
