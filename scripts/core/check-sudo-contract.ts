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
  const actionRunnerPath = path.join(scriptsDir, "core", "action-runner.ts");
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
  const actionRunner = fs.readFileSync(actionRunnerPath, "utf8");

  if (
    !actionRunner.includes('["scripts/sudo-common.sh", "--validate"]') ||
    !actionRunner.includes("validateRootPolicy") ||
    !actionRunner.includes("actionRequiresRootValidation")
  ) {
    failures.push(
      "scripts/core/action-runner.ts: runner must centrally validate root policy through scripts/sudo-common.sh",
    );
  }

  if (
    !tuiApp.includes("createInteractiveActionRunner") ||
    !tuiApp.includes("createActionEngine: createC420UIActionEngine") ||
    tuiApp.includes('from "./process-runner"') ||
    tuiApp.includes('const runnerArgs = ["action-runner", "--id", action.id]')
  ) {
    failures.push(
      "scripts/c420ui/app.ts: actions must execute through the shared c420ui Action Engine",
    );
  }

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

  const interactiveRunnerPath = path.join(
    scriptsDir,
    "c420ui",
    "interactive-action-runner.ts",
  );
  const interactiveRunner = fs.readFileSync(interactiveRunnerPath, "utf8");

  if (
    !interactiveRunner.includes("interactiveActionRequiresConfirmation(action)") ||
    !interactiveRunner.includes('status: "canceled"') ||
    !interactiveRunner.includes("!confirmed")
  ) {
    failures.push(
      "scripts/c420ui/interactive-action-runner.ts: confirmation cancellations must stop before root or bridge execution",
    );
  }

  if (
    !interactiveRunner.includes("rootProvider: options.rootProvider") ||
    !interactiveRunner.includes("engine.runAction(action")
  ) {
    failures.push(
      "scripts/c420ui/interactive-action-runner.ts: privileged actions must use the c420ui root provider before bridge execution",
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
