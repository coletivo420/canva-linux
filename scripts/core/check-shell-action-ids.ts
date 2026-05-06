#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot, loadActions } from "./action-registry";

export function main(): number {
  const rootDir = findProjectRoot();
  const actions = loadActions(rootDir);
  const actionIds = new Set(actions.map((action) => action.id));
  const visibleMissingDescription = actions.filter(
    (action) =>
      action.planned !== true &&
      action.kind === "command" &&
      ["install", "development", "maintenance"].includes(action.group) &&
      (!action.description || !action.description.trim()),
  );
  if (visibleMissingDescription.length) {
    throw new Error(
      `Visible actions missing description: ${visibleMissingDescription.map((action) => action.id).join(", ")}`,
    );
  }

  const shell = fs.readFileSync(path.join(rootDir, "canva-linux.sh"), "utf8");
  const ids = [...shell.matchAll(/run_action_by_id\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter(Boolean);
  const missing = ids.filter((id) => !actionIds.has(id));
  if (missing.length) {
    throw new Error(
      `Shell references unknown action IDs: ${[...new Set(missing)].join(", ")}`,
    );
  }

  console.log("[ok] Shell action IDs validated against scripts/actions.json");
  return 0;
}

if (
  require.main === module &&
  /check-shell-action-ids\.js$/.test(process.argv[1] || "")
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
