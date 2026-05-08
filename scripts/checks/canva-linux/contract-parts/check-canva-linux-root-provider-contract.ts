#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const providerPath = "scripts/c420ui-canva-linux/root-provider.ts";
  const adapterPath = "scripts/c420ui-canva-linux/adapter.ts";
  const cliPath = "scripts/c420ui-canva-linux/cli.ts";
  const runPath = "scripts/c420ui-canva-linux/run.ts";
  const provider = read(rootDir, providerPath);
  const adapter = read(rootDir, adapterPath);
  const cli = read(rootDir, cliPath);
  const run = read(rootDir, runPath);
  const failures: string[] = [];

  for (const fragment of [
    "createCanvaLinuxRootProvider",
    "scripts/sudo-common.sh",
    "buildOverviewStatus",
    "purge",
    "uninstall-detected",
    "CANVA_NATIVE_SCOPE",
    "CANVA_FLATPAK_SCOPE",
    "validateRootAccess",
    "buildRootActionEnvironment",
    "CANVA_C420UI_ROOT_AUTH",
    "warning:",
  ]) {
    if (!provider.includes(fragment)) {
      failures.push(`missing Canva Linux root provider fragment: ${fragment}`);
    }
  }

  if (!fs.existsSync(path.join(rootDir, "scripts/sudo-common.sh"))) {
    failures.push("scripts/sudo-common.sh must back privileged actions");
  }
  if (!cli.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux CLI must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass createCanvaLinuxRootProvider()");
  }
  if (!run.includes("rootProvider: createCanvaLinuxRootProvider()")) {
    failures.push("Canva Linux interactive c420ui must pass rootProvider to createApp");
  }
  for (const fragment of [
    "actionRequiresRootValidation",
    "buildActionEnvironment",
    "ROOT_POLICY_EXIT_CODE",
    "validateRootPolicy",
    "scripts/sudo-common.sh",
  ]) {
    if (adapter.includes(fragment)) {
      failures.push(
        `adapter must not import or implement legacy root policy fragment: ${fragment}`,
      );
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[canva-linux-root-provider-contract] OK");
  return 0;
}
