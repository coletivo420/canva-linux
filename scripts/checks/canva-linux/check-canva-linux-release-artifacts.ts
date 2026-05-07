#!/usr/bin/env node
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const adapter = createCanvaLinuxC420UIAdapter(process.cwd());
  const release = adapter.loadArtifactWorkflows().find((workflow) => workflow.id === "release-artifacts");
  const failures: string[] = [];
  if (!release) failures.push("release-artifacts workflow is required");
  const outputPatterns = release?.artifacts.map((artifact) => artifact.outputPattern ?? "") ?? [];
  for (const expected of [".AppImage", ".flatpak", "linux-unpacked-*.tar.gz", "SHA256SUMS"]) {
    if (!outputPatterns.some((pattern) => pattern.includes(expected))) {
      failures.push(`release artifacts must include ${expected}`);
    }
  }
  if (adapter.loadCapabilities().releaseValidation !== "supported") failures.push("release validation capability must be supported");

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
