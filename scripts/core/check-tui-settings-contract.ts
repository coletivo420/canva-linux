#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const app = read(rootDir, "scripts/tui/app.ts");
  const settings = read(rootDir, "scripts/tui/settings.ts");
  const actions = read(rootDir, "scripts/actions.json");

  if (!app.includes('"settings"') || !app.includes("Application Settings")) {
    failures.push("scripts/tui/app.ts: Application Settings view is required");
  }
  if (!app.includes("Enable general logs for Canva Linux Install and Development Tool")) {
    failures.push("scripts/tui/app.ts: general Tool logs setting is required");
  }
  if (!settings.includes("generalLogsEnabled")) {
    failures.push("scripts/tui/settings.ts: generalLogsEnabled setting is required");
  }
  if (!settings.includes("terminalTextSelectionMode")) {
    failures.push(
      "scripts/tui/settings.ts: terminalTextSelectionMode schema entry is required",
    );
  }
  if (
    !settings.includes("XDG_CONFIG_HOME") ||
    !settings.includes(".config") ||
    !settings.includes("tool-settings.json") ||
    !settings.includes("saveToolSettings")
  ) {
    failures.push("scripts/tui/settings.ts: user config file persistence is required");
  }
  if (
    actions.includes("Application Settings") ||
    actions.includes("generalLogsEnabled") ||
    actions.includes("terminalTextSelectionMode")
  ) {
    failures.push("scripts/actions.json: TUI settings must not be shell actions");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] TUI settings contract check passed");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
