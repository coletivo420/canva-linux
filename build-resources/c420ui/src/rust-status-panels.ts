import { runC420UIRustHost } from "./rust-host.js";
import type { C420UITuiPanelLine } from "./rust-tui-contracts.js";

export type C420UIRustStatusPanels = {
  ok: boolean;
  command: "status-panels";
  panels: {
    detectedInstallations: { label: string; lines: C420UITuiPanelLine[] };
    generatedArtifacts: { label: string; lines: C420UITuiPanelLine[] };
    linuxArtifacts: { label: string; lines: C420UITuiPanelLine[] };
    content: { label: string; lines: C420UITuiPanelLine[] };
  };
  diagnostics: Array<{ level: string; code: string; message: string }>;
};

export async function createC420UIRustStatusPanels(options: {
  rootDir: string;
  projectConfigRoot: string;
  overviewStatus: unknown;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustStatusPanels> {
  return runC420UIRustHost<C420UIRustStatusPanels>({
    rootDir: options.rootDir,
    command: "status-panels",
    input: {
      rootDir: options.rootDir,
      projectConfigRoot: options.projectConfigRoot,
      overviewStatus: options.overviewStatus,
    },
    env: options.env,
  });
}
