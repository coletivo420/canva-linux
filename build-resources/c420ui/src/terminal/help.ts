import type { C420UIConfig } from "../types";

export type c420uiTerminalHelpOptions = {
  config: C420UIConfig;
  launcherCommand?: string;
};

export function formatC420UITerminalHelp(
  options: c420uiTerminalHelpOptions,
): string {
  const launcher =
    options.launcherCommand || options.config.project.launcherCommand;

  return [
    `${options.config.project.projectName} c420ui terminal interface`,
    "",
    "Usage:",
    "  npm run c420ui",
    launcher ? `  ${launcher}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function printC420UITerminalHelp(
  options: c420uiTerminalHelpOptions,
): void {
  console.log(formatC420UITerminalHelp(options));
}
