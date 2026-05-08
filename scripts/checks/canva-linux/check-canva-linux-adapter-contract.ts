#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createCanvaLinuxC420UIAdapter } from "../../c420ui-canva-linux/adapter";

export function main(): number {
  const rootDir = process.cwd();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const failures: string[] = [];
  const project = adapter.projectInfo();
  const capabilities = adapter.loadCapabilities();
  if (adapter.id !== "canva-linux") failures.push("adapter id must identify the project adapter");
  if (!project.projectName) failures.push("adapter must load project name");
  if (!project.appId) failures.push("adapter must load app id");
  if (!adapter.actions().length) failures.push("adapter must expose concrete actions through the generic bridge");
  if (!adapter.loadWorkflows().length) failures.push("adapter must expose c420ui workflows");
  if (!adapter.artifactWorkflows().length) failures.push("adapter must expose artifact workflows through the generic bridge");
  if (capabilities.supportsRootActions !== true) failures.push("adapter must declare root action support");
  if (capabilities.supportsDryRun !== true) failures.push("adapter must declare dry-run support");
  if (typeof adapter.runAction !== "function") failures.push("adapter must implement runAction");

  const cliBridgePath = path.join(rootDir, "scripts/c420ui-canva-linux/cli.ts");
  const cliEntrypointPath = path.join(rootDir, "scripts/run-c420ui-cli.ts");
  const launcherPath = path.join(rootDir, "canva-linux.sh");
  if (!fs.existsSync(cliBridgePath)) failures.push("Canva Linux c420ui CLI bridge must exist");
  if (!fs.existsSync(cliEntrypointPath)) failures.push("Canva Linux c420ui CLI entrypoint must exist");
  const cliBridge = fs.readFileSync(cliBridgePath, "utf8");
  if (!cliBridge.includes("emit:")) failures.push("Canva Linux c420ui CLI must forward emitted action logs");
  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/c420ui-canva-linux/adapter.ts"), "utf8");
  for (const fragment of [
    "validateRootPolicy",
    "actionRequiresRootValidation",
    "ROOT_POLICY_EXIT_CODE",
    "buildActionEnvironment",
    "sudo-common.sh",
  ]) {
    if (adapterSource.includes(fragment)) {
      failures.push(`adapter must not depend on legacy root preflight: ${fragment}`);
    }
  }
  if (!adapterSource.includes("const actionEnv = context.env")) {
    failures.push("adapter must use the Action Engine/root provider prepared context.env");
  }
  if (adapterSource.includes("...context.env, ...(action.env")) {
    failures.push("adapter must not merge action.env after root provider environment preparation");
  }
  const launcher = fs.readFileSync(launcherPath, "utf8");
  if (!launcher.includes("run-c420ui-cli.js")) failures.push("launcher must call run-c420ui-cli.js for direct actions");
  if (launcher.includes("run-core-entry.sh action-runner --cli")) failures.push("launcher direct actions must not call the legacy Action Runner CLI");
  if (launcher.includes("--install-native | --install-flatpak")) failures.push("launcher must not hardcode the direct action flag list");
  if (!launcher.includes("ensure_c420ui_cli_entrypoint")) failures.push("launcher must build the c420ui CLI entrypoint conditionally");

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-adapter-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[canva-linux-adapter-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
