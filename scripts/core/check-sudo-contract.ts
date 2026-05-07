#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function findCheckedFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push(...findCheckedFiles(fullPath));
    } else if (/\.(sh|ts)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isAllowedSudoText(line: string): boolean {
  return [
    "with sudo or as root.",
    "Install and Development Tool with sudo or as root.",
    "Do not run Canva Linux Install and Development Tool with sudo or as root.",
    "Do not run this tool with sudo or as root.",
    "Do not run the Tool with sudo or as root",
    "root/sudo launch is blocked",
    "must not instruct users to run ./canva-linux.sh with sudo",
    "sudo password must never be written to logs",
    "sudo stdin must never be logged",
  ].some((allowed) => line.includes(allowed));
}

export function main(): number {
  const rootDir = findProjectRoot();
  const scriptsDir = path.join(rootDir, "scripts");
  const sudoCommonPath = path.join(scriptsDir, "sudo-common.sh");
  const tuiAppPath = path.join(scriptsDir, "c420ui", "app.ts");
  const checkedFiles = [
    ...findCheckedFiles(scriptsDir),
    path.join(rootDir, "canva-linux.sh"),
  ].filter((f) => {
    const relative = path.relative(rootDir, f);
    return (
      !relative.endsWith("sudo-common.sh") &&
      relative !== "scripts/core/check-sudo-contract.ts" &&
      relative !== "scripts/core/check-ai-guardrails.ts"
    );
  });
  const failures: string[] = [];
  const sudoCommon = fs.readFileSync(sudoCommonPath, "utf8");
  const tuiApp = fs.readFileSync(tuiAppPath, "utf8");

  if (!/--validate-stdin\)\s*canva_sudo_validate_stdin\s*;;/.test(sudoCommon)) {
    failures.push(
      "scripts/sudo-common.sh: dispatcher must implement --validate-stdin",
    );
  }

  if (!sudoCommon.includes('sudo -S -v -p ""')) {
    failures.push(
      'scripts/sudo-common.sh: --validate-stdin must validate with sudo -S -v -p ""',
    );
  }

  if (!/password\s*=\s*"\$\(cat\)"/.test(sudoCommon)) {
    failures.push("scripts/sudo-common.sh: --validate-stdin must read stdin");
  }

  if (
    !tuiApp.includes("formatAuthFailureMessage") ||
    !tuiApp.includes("await errorDialog(") ||
    !tuiApp.includes("Administrator authentication failed") ||
    !tuiApp.includes('setProgressError("root authentication failed")')
  ) {
    failures.push(
      "scripts/c420ui/app.ts: sudo auth failures must be shown in a popup",
    );
  }

  const authFailureBlock = tuiApp.match(
    /if \(\(auth\.status \?\? 1\) !== 0\) \{[\s\S]*?\n      \}/,
  )?.[0];
  if (!authFailureBlock?.includes("return;")) {
    failures.push(
      "scripts/c420ui/app.ts: privileged actions must not start after failed sudo auth",
    );
  }

  if (/appendLogText\([^)]*password/s.test(tuiApp)) {
    failures.push(
      "scripts/c420ui/app.ts: sudo password must never be written to logs",
    );
  }

  for (const fullPath of checkedFiles) {
    const relativePath = path.relative(rootDir, fullPath);
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.trim().startsWith("#")) return;
      if (isAllowedSudoText(line)) return;
      if (
        /(^|[^A-Za-z0-9_])sudo(\s|$)/.test(line) ||
        /['"]sudo['"]/.test(line)
      ) {
        failures.push(
          `${relativePath}:${index + 1}: raw sudo is forbidden; use scripts/sudo-common.sh`,
        );
      }
    });
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Sudo contract check passed");
  return 0;
}

if (
  require.main === module &&
  /check-sudo-contract\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
