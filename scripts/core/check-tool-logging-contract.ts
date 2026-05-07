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
  const launcher = read(rootDir, "canva-linux.sh");

  if (!launcher.includes(": > \"${SESSION_LOG}\"")) {
    failures.push("canva-linux.sh: launcher must create/truncate the session log once");
  }
  if (!app.includes('flags: "a"')) {
    failures.push("scripts/tui/app.ts: TUI must append to the launcher session log");
  }
  if (!app.includes("importLauncherSessionLog")) {
    failures.push("scripts/tui/app.ts: launcher logs must be imported when Tool logs are enabled");
  }
  if (!app.includes("Tool |") || !app.includes("Action |")) {
    failures.push("scripts/tui/app.ts: Tool logs and Action logs must remain distinguishable");
  }
  if (!app.includes("shouldDisplayLogLine") || !app.includes("isCriticalToolLog")) {
    failures.push(
      "scripts/tui/app.ts: critical Tool warnings/errors must remain visible when general Tool logs are disabled",
    );
  }
  if (/appendLogText\([^)]*password/s.test(app)) {
    failures.push("scripts/tui/app.ts: sudo password must never be written to logs");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Tool logging contract check passed");
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
