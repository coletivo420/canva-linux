#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const run = read(rootDir, "scripts/c420ui-canva-linux/run.ts");
  const runner = read(rootDir, "scripts/c420ui/interactive-action-runner.ts");
  const bridge = read(rootDir, "packages/c420ui/src/bridge.ts");
  const failures: string[] = [];

  for (const fragment of [
    "createC420UIActionEngine",
    "createInteractiveActionRunner",
    "rootProvider?: c420uiRootProvider",
    "bridge: c420uiProjectBridge",
  ]) {
    if (!app.includes(fragment)) {
      failures.push(`interactive app must include action engine fragment: ${fragment}`);
    }
  }
  for (const fragment of [
    "createC420UIActionEngine",
    "engine.runAction(action",
    "requiresC420UIActionConfirmation",
    "AbortController",
    "signal: abortController.signal",
    "function cancel()",
  ]) {
    if (!runner.includes(fragment)) {
      failures.push(`interactive action runner must include action engine fragment: ${fragment}`);
    }
  }

  if (app.includes('from "./process-runner"') || app.includes("from './process-runner'")) {
    failures.push("interactive app must not import ./process-runner");
  }
  if (app.includes("scripts/run-core-entry.sh ${runnerArgs")) {
    failures.push("interactive app must not route actions through the legacy action-runner path");
  }
  if (app.includes("sudo-common.sh")) {
    failures.push("interactive app must not call sudo-common.sh directly");
  }
  if (!run.includes("createCanvaLinuxRootProvider")) {
    failures.push("Canva Linux c420ui run path must import createCanvaLinuxRootProvider");
  }
  if (!run.includes("rootProvider: createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux c420ui run path must pass rootProvider to createApp");
  }
  if (bridge.includes("C420UISudoProvider")) {
    failures.push("bridge contract must not reintroduce C420UISudoProvider");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-interactive-action-engine-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[c420ui-interactive-action-engine-contract] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
