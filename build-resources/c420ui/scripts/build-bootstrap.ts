import fs from "node:fs";
import path from "node:path";

import { runC420UIRustBootstrap } from "../src/rust-bootstrap.js";

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

async function main(): Promise<void> {
  const rootDir = findProjectRoot();
  const output = await runC420UIRustBootstrap({
    rootDir,
    bootstrapOutDir:
      process.env.C420UI_BOOTSTRAP_OUT_DIR ??
      "build-resources/c420ui/bootstrap/generated",
    projectConfigRoot:
      process.env.C420UI_PROJECT_CONFIG_ROOT ??
      "build-resources/canva-linux/config",
    buildMetadataPath:
      process.env.C420UI_BUILD_METADATA_PATH ??
      "build-resources/canva-linux/config/build-metadata.json",
  });
  if (!output.ok) {
    throw new Error(
      output.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n") ||
        "c420ui-host bootstrap failed",
    );
  }
}

if (/build-bootstrap\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
