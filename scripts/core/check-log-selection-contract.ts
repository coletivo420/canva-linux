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
  const normalizedCliDocs = cliDocs.replace(/\s+/g, " ");
  const normalizedTechnicalDocs = technicalDocs.replace(/\s+/g, " ");

  if (!app.includes('screen.key(["f5"]')) {
    failures.push("scripts/tui/app.ts: F5 log copy shortcut must remain available");
  }
  if (!app.includes('screen.key(["f6"]')) {
    failures.push("scripts/tui/app.ts: F6 plain logs fallback must remain available");
  }
  if (!app.includes("terminalTextSelectionMode")) {
    failures.push("scripts/tui/app.ts: terminal text selection mode is required");
  }
  if (!app.includes("type FocusZone") || !app.includes("FOCUS_ZONES")) {
    failures.push("scripts/tui/app.ts: explicit FocusZone model is required");
  }
  if (!app.includes("function applyFocusStyles")) {
    failures.push("scripts/tui/app.ts: active panel styling must be centralized");
  }
  if (
    !app.includes('screen.key(["tab"]') ||
    !app.includes('screen.key(["S-tab", "backtab"]')
  ) {
    failures.push("scripts/tui/app.ts: Tab and Shift+Tab focus navigation are required");
  }
  if (!app.includes("if (!modalActive) moveFocus")) {
    failures.push(
      "scripts/tui/app.ts: modal dialogs must not leak Tab focus to the main TUI",
    );
  }
  if (
    !app.includes("focusZone === \"menu\"") ||
    !app.includes("running || modalActive || focusZone !== \"menu\"")
  ) {
    failures.push(
      "scripts/tui/app.ts: action execution must be blocked unless menu is focused and idle",
    );
  }
  if (!app.includes("activeCellBg") || !app.includes("activeCheckboxFg")) {
    failures.push(
      "scripts/tui/app.ts: active cells and settings checkboxes must be visibly styled",
    );
  }
  if (
    !app.includes("terminalTextSelectionModeActive") ||
    !app.includes("const tuiMouseEnabled = !terminalTextSelectionModeActive")
  ) {
    failures.push(
      "scripts/tui/app.ts: terminal selection mode must be resolved before Blessed widgets are constructed",
    );
  }
  const mouseControlledWidgetCount =
    app.match(/mouse: tuiMouseEnabled/g)?.length ?? 0;
  if (mouseControlledWidgetCount < 4) {
    failures.push(
      "scripts/tui/app.ts: terminal selection mode must disable TUI mouse handling for menu, diagnostics, content and logs at startup",
    );
  }
  if (
    !app.includes("function applyProgramMouseMode") ||
    !app.includes("disableMouse") ||
    !app.includes("enableMouse")
  ) {
    failures.push(
      "scripts/tui/app.ts: terminal selection mode must disable and restore screen program mouse handling",
    );
  }
  if (!app.includes("Logs - Text selection mode enabled")) {
    failures.push(
      "scripts/tui/app.ts: enabled terminal text selection mode must be visible in the logs label",
    );
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
    !technicalDocs.includes("Terminal text selection mode") ||
    !normalizedCliDocs.includes("next TUI start") ||
    !normalizedTechnicalDocs.includes("next TUI start") ||
    !normalizedCliDocs.includes("F6") ||
    !normalizedTechnicalDocs.includes("F6") ||
    !normalizedTechnicalDocs
      .toLowerCase()
      .includes("some terminals may still require shift") ||
    !app.includes("Tab / Shift+Tab") ||
    !app.includes("Active panel") ||
    !app.includes("Active cell")
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
