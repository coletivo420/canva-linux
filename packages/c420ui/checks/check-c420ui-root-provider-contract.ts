#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = process.cwd();
  const rootProvider = read(rootDir, "packages/c420ui/src/root-provider.ts");
  const actionEngine = read(rootDir, "packages/c420ui/src/action-engine.ts");
  const index = read(rootDir, "packages/c420ui/src/index.ts");
  const failures: string[] = [];

  for (const fragment of [
    "c420uiRootProvider",
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
    "c420uiRootPolicyExitCode",
  ]) {
    if (!rootProvider.includes(fragment)) {
      failures.push(`missing root provider contract fragment: ${fragment}`);
    }
  }

  for (const fragment of [
    "rootProvider?: c420uiRootProvider",
    "rootProvider.buildActionEnvironment",
    "rootProvider.validateActionScope",
    "rootProvider.resolveRootPolicy",
    "rootProvider.validateRootAccess",
    "bridge.runAction",
  ]) {
    if (!actionEngine.includes(fragment)) {
      failures.push(`action engine root provider preflight missing: ${fragment}`);
    }
  }

  const rootPreflightIndex = actionEngine.indexOf(
    "rootProvider.validateRootAccess",
  );
  const runActionIndex = actionEngine.indexOf("bridge.runAction");
  if (
    rootPreflightIndex === -1 ||
    runActionIndex === -1 ||
    rootPreflightIndex > runActionIndex
  ) {
    failures.push("root provider preflight must run before bridge.runAction");
  }

  if (!index.includes('export type * from "./root-provider"')) {
    failures.push("index must export root provider types");
  }
  if (!index.includes('c420uiRootPolicyExitCode')) {
    failures.push("index must export c420uiRootPolicyExitCode");
  }
  if (rootProvider.includes("sudo-common.sh") || actionEngine.includes("sudo")) {
    failures.push("c420ui core must not call sudo directly");
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-root-provider-contract] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[c420ui-root-provider-contract] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
