#!/usr/bin/env node
import { main as checkAdapterContractMain } from "./contract-parts/check-canva-linux-adapter-contract";
import { main as checkRootProviderContractMain } from "./contract-parts/check-canva-linux-root-provider-contract";
import { main as checkArtifactRecipesMain } from "./contract-parts/check-canva-linux-artifact-recipes";
import { main as checkAppImageContractMain } from "./contract-parts/check-canva-linux-appimage-contract";
import { main as checkFlatpakContractMain } from "./contract-parts/check-canva-linux-flatpak-contract";
import { main as checkReleaseArtifactsMain } from "./contract-parts/check-canva-linux-release-artifacts";
import { main as checkPublicBrandingMain } from "../../core/canva-linux-contract-parts/check-c420ui-branding";
import { main as checkProjectBoundaryMain } from "../../core/canva-linux-contract-parts/check-c420ui-project-boundary";
import { main as checkSudoCommonContractMain } from "../../core/canva-linux-contract-parts/check-sudo-contract";
import { main as checkLauncherSessionLogsMain } from "../../core/canva-linux-contract-parts/check-tool-logging-contract";
import { main as checkInteractiveLogUiIntegrationMain } from "../../core/canva-linux-contract-parts/check-log-selection-contract";

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

function checkAdapterContract(failures: string[]): void {
  runCheck(failures, { name: "adapter contract", run: checkAdapterContractMain });
}

function checkRootProviderContract(failures: string[]): void {
  runCheck(failures, { name: "root provider contract", run: checkRootProviderContractMain });
}

function checkSudoCommonContract(failures: string[]): void {
  runCheck(failures, { name: "sudo-common contract", run: checkSudoCommonContractMain });
}

function checkPublicBranding(failures: string[]): void {
  runCheck(failures, { name: "public branding", run: checkPublicBrandingMain });
}

function checkProjectBoundary(failures: string[]): void {
  runCheck(failures, { name: "project adapter boundary", run: checkProjectBoundaryMain });
}

function checkArtifactRecipes(failures: string[]): void {
  runCheck(failures, { name: "artifact recipes", run: checkArtifactRecipesMain });
}

function checkAppImageContract(failures: string[]): void {
  runCheck(failures, { name: "AppImage contract", run: checkAppImageContractMain });
}

function checkFlatpakContract(failures: string[]): void {
  runCheck(failures, { name: "Flatpak contract", run: checkFlatpakContractMain });
}

function checkReleaseArtifacts(failures: string[]): void {
  runCheck(failures, { name: "release artifacts", run: checkReleaseArtifactsMain });
}

function checkLauncherSessionLogs(failures: string[]): void {
  runCheck(failures, { name: "launcher session logs", run: checkLauncherSessionLogsMain });
}

function checkInteractiveLogUiIntegration(failures: string[]): void {
  runCheck(failures, { name: "interactive log UI integration", run: checkInteractiveLogUiIntegrationMain });
}

export function main(): number {
  const failures: string[] = [];

  checkAdapterContract(failures);
  checkRootProviderContract(failures);
  checkSudoCommonContract(failures);
  checkPublicBranding(failures);
  checkProjectBoundary(failures);
  checkArtifactRecipes(failures);
  checkAppImageContract(failures);
  checkFlatpakContract(failures);
  checkReleaseArtifacts(failures);
  checkLauncherSessionLogs(failures);
  checkInteractiveLogUiIntegration(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-contracts] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-contracts] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
