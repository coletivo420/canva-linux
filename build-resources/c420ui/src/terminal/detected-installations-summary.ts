import { createC420UIRustStatusPanels } from "../rust-status-panels.js";
import type { C420UITuiPanelLine } from "../rust-tui-contracts.js";

export type DetectionPanelSummaries = Awaited<
  ReturnType<typeof createC420UIRustStatusPanels>
>["panels"];

export const formatDetectionPanelSummaries = createC420UIRustStatusPanels;

export function createDeprecatedDetectionPanelSummaries(): {
  detectedInstallations: C420UITuiPanelLine[];
  generatedArtifacts: C420UITuiPanelLine[];
  linuxArtifacts: C420UITuiPanelLine[];
} {
  return {
    detectedInstallations: [],
    generatedArtifacts: [],
    linuxArtifacts: [],
  };
}

export async function formatDetectedInstallationsSummary(): Promise<string[]> {
  const panels = await createC420UIRustStatusPanels({
    rootDir: process.cwd(),
    projectConfigRoot: "config",
    overviewStatus: null,
  });
  return [
    panels.panels.detectedInstallations.label,
    panels.panels.generatedArtifacts.label,
    panels.panels.linuxArtifacts.label,
  ];
}
