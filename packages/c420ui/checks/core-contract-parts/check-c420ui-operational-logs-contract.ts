#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const operationalLogs = read(rootDir, "packages/c420ui/src/operational-logs.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "createC420UIOperationalLogEvent",
    "redactC420UILogLine",
    "c420uiDefaultRedactionPatterns",
    "Bearer [redacted]",
    "[redacted]",
    "redact?: boolean",
    "timestamp: new Date().toISOString()",
  ]) {
    if (!operationalLogs.includes(fragment)) {
      failures.push(`operational logs contract must include fragment: ${fragment}`);
    }
  }

  if (!index.includes('from "./operational-logs"')) {
    failures.push("index must export operational log helpers");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-operational-logs-contract] OK");
  return 0;
}
