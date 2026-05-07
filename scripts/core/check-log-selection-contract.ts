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
  const cliDocs = read(rootDir, "docs/CLI.md");
  const technicalDocs = read(rootDir, "docs/TECHNICAL.md");

  if (!app.includes('screen.key(["f5"]')) {
    failures.push("scripts/tui/app.ts: F5 log copy shortcut must remain available");
  }
  if (!app.includes("terminalTextSelectionMode")) {
    failures.push("scripts/tui/app.ts: terminal text selection mode is required");
  }
  if (!app.includes("logs.options.mouse")) {
    failures.push("scripts/tui/app.ts: terminal selection mode must disable logs mouse handling");
  }
  for (const keyHandler of [
    'screen.key(["pageup"]',
    'screen.key(["pagedown"]',
    'screen.key(["home"]',
    'screen.key(["end"]',
  ]) {
    if (!app.includes(keyHandler)) {
      failures.push(
        "scripts/tui/app.ts: keyboard log scrolling must remain available",
      );
    }
  }
  if (
    !cliDocs.includes("terminal text selection") ||
    !technicalDocs.includes("Terminal text selection mode")
  ) {
    failures.push("docs: terminal text selection behavior must be documented");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Log selection contract check passed");
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
