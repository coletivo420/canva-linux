#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

type CompatibilityCheck = {
  name: string;
  builtScript: string;
};

const checks: CompatibilityCheck[] = [
  { name: "actions", builtScript: "validate-actions.js" },
  { name: "no shell menu", builtScript: "check-no-shell-menu.js" },
  { name: "no root launch", builtScript: "check-no-root-launch-contract.js" },
  { name: "c420ui settings", builtScript: "check-c420ui-settings-contract.js" },
  { name: "action contract", builtScript: "check-action-contract.js" },
  { name: "detection contract", builtScript: "check-detection-contract.js" },
  { name: "version consistency", builtScript: "check-version-consistency.js" },
  { name: "release contract", builtScript: "check-release-contract.js" },
  { name: "shell action IDs", builtScript: "check-shell-action-ids.js" },
];

export function main(): number {
  const failures: string[] = [];
  const buildDir = path.join(process.cwd(), ".build", "scripts", "core");

  for (const check of checks) {
    const result = spawnSync(process.execPath, [path.join(buildDir, check.builtScript)], {
      stdio: "inherit",
    });
    if (result.error) {
      failures.push(`${check.name}: ${result.error.message}`);
      continue;
    }
    if (result.status !== 0) failures.push(`${check.name}: exited with ${result.status}`);
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[legacy-action-runner-compatibility] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[legacy-action-runner-compatibility] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
