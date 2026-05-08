#!/usr/bin/env node
import { main as checkTypeScriptWrappersMain } from "./repository-policy-parts/check-typescript-wrapper-contract";
import { main as checkTypeScriptFirstMain } from "./repository-policy-parts/check-typescript-first";
import { main as checkGitignorePolicyMain } from "./repository-policy-parts/check-gitignore-policy";
import { main as checkNoSourceJavaScriptMain } from "./repository-policy-parts/check-no-source-javascript";
import { main as checkSourceIntegrityMain } from "./repository-policy-parts/check-source-integrity";
import { main as checkReviewChecklistMain } from "./repository-policy-parts/check-review-checklist";

type PolicyCheck = {
  name: string;
  run: () => number;
};

function runCheck(failures: string[], check: PolicyCheck): void {
  try {
    const exitCode = check.run();
    if (exitCode !== 0) failures.push(`${check.name}: exited with ${exitCode}`);
  } catch (error) {
    failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkTypeScriptWrappers(failures: string[]): void {
  runCheck(failures, { name: "TypeScript wrapper contract", run: checkTypeScriptWrappersMain });
}

function checkTypeScriptFirst(failures: string[]): void {
  runCheck(failures, { name: "TypeScript-first policy", run: checkTypeScriptFirstMain });
}

function checkGitignorePolicy(failures: string[]): void {
  runCheck(failures, { name: "gitignore policy", run: checkGitignorePolicyMain });
}

function checkNoSourceJavaScript(failures: string[]): void {
  runCheck(failures, { name: "no source JavaScript", run: checkNoSourceJavaScriptMain });
}

function checkSourceIntegrity(failures: string[]): void {
  runCheck(failures, { name: "source integrity", run: checkSourceIntegrityMain });
}

function checkReviewChecklist(failures: string[]): void {
  runCheck(failures, { name: "review checklist", run: checkReviewChecklistMain });
}

export function main(): number {
  const failures: string[] = [];

  checkTypeScriptWrappers(failures);
  checkTypeScriptFirst(failures);
  checkGitignorePolicy(failures);
  checkNoSourceJavaScript(failures);
  checkSourceIntegrity(failures);
  checkReviewChecklist(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[repository-policy] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[repository-policy] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
