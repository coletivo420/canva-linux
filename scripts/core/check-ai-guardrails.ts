#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

const requiredFiles = [
  "docs/AI_GUARDRAILS.md",
  "docs/VALIDATION.md",
  "docs/TYPESCRIPT.md",
  "docs/CANVA_LINUX_EYEDROPPER.md",
  "README.md",
];

const readmeRefs = [
  "docs/README.md",
  "docs/VALIDATION.md",
  "docs/DEVELOPMENT.md",
  "docs/TYPESCRIPT.md",
  "docs/CANVA_LINUX_EYEDROPPER.md",
  "docs/AI_GUARDRAILS.md",
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const requiredGuardrails = [
  "The interactive shell menu has been removed.",
  "The project exposes only C420UI and direct CLI actions.",
  "Legacy explicit C420UI routing flags are removed. The launcher opens C420UI when called without args; any argument is resolved as direct CLI.",
  "Legacy interface-routing environment variables are removed and must not be read for interface routing.",
  "terminalTextSelectionMode must disable mouse capture globally, not only on the logs widget.",
  "F5 clipboard copy must keep working even when text selection mode is enabled.",
  "Release identity must use the npm-compatible package version everywhere; do not publish four-number dotted versions.",
  "Linux release asset names must use `x86_64`, not `x64`.",
  "System-wide actions must use scripts/sudo-common.sh.",
  "Raw sudo calls are forbidden outside scripts/sudo-common.sh.",
  "User-scope actions must never call sudo.",
  "overview-status must always emit valid JSON.",
  "C420UI and CLI must share the same TypeScript action contract.",
  "REVIEW.md must preserve the Review Checklist.",
  "TypeScript is mandatory for all Node.js source code.",
  "All maintained Node.js source code is TypeScript.",
  "JavaScript is generated output only.",
  "Shell remains shell for host operations.",
  "New scripts must be TypeScript unless they are shell scripts for host operations.",
  "New tests must be TypeScript.",
  "New configs should be TypeScript when tool-supported.",
  "Do not create new JavaScript source files.",
  "Do not add `scripts/*.js` as maintained source.",
  "Do not add `test/*.js`.",
  "Do not add JavaScript config files when TypeScript config is supported.",
  "JavaScript may exist only as project-generated output under `.build`, package-managed dependencies under `node_modules`, generated coverage output under `coverage`, or distributable output under `dist`.",
  "Project-generated JavaScript belongs in `.build` only; do not place maintained or project-generated script artifacts elsewhere.",
  "Shell scripts are allowed only for Linux host operations, launcher glue, Flatpak/native install, sudo, purge, XDG, and validation that must run before Node.",
  "JSON/YAML/XML/Desktop files remain native data formats and must be validated by TypeScript checks where appropriate.",
  "Flathub source generation must be TypeScript-backed.",
  "If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.",
];

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, file)))
      failures.push(`missing required file: ${file}`);
  }

  const readme = fs.existsSync(path.join(rootDir, "README.md"))
    ? fs.readFileSync(path.join(rootDir, "README.md"), "utf8")
    : "";
  for (const ref of readmeRefs) {
    if (!readme.includes(ref))
      failures.push(`README missing documentation reference: ${ref}`);
  }
  if (readme.includes("Shell Tool"))
    failures.push("README must not mention Shell Tool");

  const guardrails = fs.existsSync(path.join(rootDir, "docs/AI_GUARDRAILS.md"))
    ? fs.readFileSync(path.join(rootDir, "docs/AI_GUARDRAILS.md"), "utf8")
    : "";
  const normalizedGuardrails = normalizeWhitespace(guardrails);
  for (const fragment of requiredGuardrails) {
    if (!normalizedGuardrails.includes(normalizeWhitespace(fragment)))
      failures.push(`AI_GUARDRAILS missing rule: ${fragment}`);
  }

  const review = fs.existsSync(path.join(rootDir, "REVIEW.md"))
    ? fs.readFileSync(path.join(rootDir, "REVIEW.md"), "utf8")
    : "";
  if (!review.startsWith("# Review Checklist"))
    failures.push("REVIEW.md must preserve the Review Checklist at the top");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ai-guardrails] OK");
  return 0;
}

if (
  require.main === module &&
  /check-ai-guardrails\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[ai-guardrails] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
