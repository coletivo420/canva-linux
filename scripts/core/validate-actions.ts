#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  findProjectRoot,
  loadActions,
  validateActions,
} from "./action-registry";

export function main(): number {
  const rootDir = findProjectRoot();
  const actions = loadActions(rootDir);
  validateActions(actions);

  const cli = new Set<string>();
  for (const action of actions) {
    if (
      action.kind === "command" &&
      action.command === "bash" &&
      action.args?.[0]?.endsWith(".sh")
    ) {
      const scriptPath = path.join(rootDir, action.args[0]);
      if (!fs.existsSync(scriptPath))
        throw new Error(`Missing script for action: ${action.id}`);
      fs.accessSync(scriptPath, fs.constants.X_OK);
    }
    if (
      action.dangerous &&
      !(action.confirmationTitle || action.confirmationMessage)
    ) {
      throw new Error(
        `Dangerous action requires confirmation metadata: ${action.id}`,
      );
    }
    if ((action.planned || action.kind === "planned") && !action.description) {
      throw new Error(`Planned action must include description: ${action.id}`);
    }
    for (const alias of action.cli || []) {
      if (cli.has(alias)) throw new Error(`Duplicate CLI alias: ${alias}`);
      cli.add(alias);
    }
    if (
      action.group === "development" &&
      action.section === "Package generation" &&
      (action.planned || action.kind === "planned")
    ) {
      const description = (action.description || "").toLowerCase();
      if (
        !["aur", "deb", "rpm"].some((keyword) => description.includes(keyword))
      ) {
        throw new Error(
          `Planned development package action must mention AUR/deb/rpm: ${action.id}`,
        );
      }
    }
  }

  console.log("actions.json validation OK");
  console.log(`Validated actions: ${actions.length}`);
  console.log(`Validated CLI aliases: ${cli.size}`);
  return 0;
}

if (
  require.main === module &&
  /validate-actions\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
