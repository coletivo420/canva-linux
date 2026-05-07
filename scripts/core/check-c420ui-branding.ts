#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

const publicFiles = [
  "README.md",
  "docs/TECHNICAL.md",
  "docs/VALIDATION.md",
  "docs/TYPESCRIPT.md",
  "docs/CLI.md",
  "docs/RELEASE.md",
  "CHANGELOG.md",
  "scripts/project-ui.json",
];

const bannedPhrases = [
  "Terminal Assistant",
  "Blessed TUI",
  "Canva Linux Terminal Assistant",
  "C420UI",
];

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const relativePath of publicFiles) {
    const content = read(rootDir, relativePath);
    for (const phrase of bannedPhrases) {
      if (content.includes(phrase)) {
        failures.push(`${relativePath}: use c420ui instead of ${phrase}`);
      }
    }
    if (/\bTUI\b/.test(content)) {
      failures.push(`${relativePath}: do not use TUI as a product name`);
    }
  }

  const readme = read(rootDir, "README.md");
  if (!readme.includes("c420ui terminal interface")) {
    failures.push("README.md: must name the terminal interface c420ui");
  }
  if (!readme.includes("**c420ui workspace**")) {
    failures.push("README.md: feature matrix must use c420ui workspace");
  }

  const projectUi = JSON.parse(read(rootDir, "scripts/project-ui.json")) as {
    c420uiTitle?: string;
  };
  if (!projectUi.c420uiTitle?.includes("c420ui terminal interface")) {
    failures.push("scripts/project-ui.json: c420uiTitle must use c420ui terminal interface");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-branding] OK");
  return 0;
}

if (
  require.main === module &&
  /check-c420ui-branding\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[c420ui-branding] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
