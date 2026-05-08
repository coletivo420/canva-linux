#!/usr/bin/env node
import { main as checkBoundaryMain } from "./core-contract-parts/check-c420ui-boundary";
import { main as checkPackagePolicyMain } from "./core-contract-parts/check-c420ui-package-policy";
import { main as checkNamingMain } from "./core-contract-parts/check-c420ui-naming";
import { main as checkBridgeContractMain } from "./core-contract-parts/check-c420ui-bridge-contract";
import { main as checkActionEngineMain } from "./core-contract-parts/check-c420ui-action-engine-contract";
import { main as checkCliContractMain } from "./core-contract-parts/check-c420ui-cli-contract";
import { main as checkRootProviderMain } from "./core-contract-parts/check-c420ui-root-provider-contract";
import { main as checkCommandRunnerMain } from "./core-contract-parts/check-c420ui-command-runner-contract";
import { main as checkOperationalLogsMain } from "./core-contract-parts/check-c420ui-operational-logs-contract";
import { main as checkArtifactWorkflowsMain } from "./core-contract-parts/check-c420ui-artifact-workflow-contract";
import { main as checkInteractiveActionEngineMain } from "./core-contract-parts/check-c420ui-interactive-action-engine-contract";

type ContractCheck = {
  name: string;
  run: () => number;
};

function runCheck(failures: string[], check: ContractCheck): void {
  try {
    const exitCode = check.run();
    if (exitCode !== 0) failures.push(`${check.name}: exited with ${exitCode}`);
  } catch (error) {
    failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkBoundary(failures: string[]): void {
  runCheck(failures, { name: "boundary", run: checkBoundaryMain });
}

function checkPackagePolicy(failures: string[]): void {
  runCheck(failures, { name: "package policy", run: checkPackagePolicyMain });
}

function checkPublicApiExports(failures: string[]): void {
  runCheck(failures, { name: "public API exports", run: checkNamingMain });
}

function checkBridgeContract(failures: string[]): void {
  runCheck(failures, { name: "bridge contract", run: checkBridgeContractMain });
}

function checkActionEngine(failures: string[]): void {
  runCheck(failures, { name: "action engine", run: checkActionEngineMain });
}

function checkCliContract(failures: string[]): void {
  runCheck(failures, { name: "CLI contract", run: checkCliContractMain });
}

function checkRootProvider(failures: string[]): void {
  runCheck(failures, { name: "root provider", run: checkRootProviderMain });
}

function checkCommandRunner(failures: string[]): void {
  runCheck(failures, { name: "command runner", run: checkCommandRunnerMain });
}

function checkOperationalLogs(failures: string[]): void {
  runCheck(failures, { name: "operational logs", run: checkOperationalLogsMain });
}

function checkArtifactWorkflows(failures: string[]): void {
  runCheck(failures, { name: "artifact workflows", run: checkArtifactWorkflowsMain });
}

function checkInteractiveActionEngine(failures: string[]): void {
  runCheck(failures, { name: "interactive action engine", run: checkInteractiveActionEngineMain });
}

export function main(): number {
  const failures: string[] = [];

  checkBoundary(failures);
  checkPackagePolicy(failures);
  checkPublicApiExports(failures);
  checkBridgeContract(failures);
  checkActionEngine(failures);
  checkCliContract(failures);
  checkRootProvider(failures);
  checkCommandRunner(failures);
  checkOperationalLogs(failures);
  checkArtifactWorkflows(failures);
  checkInteractiveActionEngine(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-core-contracts] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[c420ui-core-contracts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
