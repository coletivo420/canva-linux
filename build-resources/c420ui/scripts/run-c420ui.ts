import path from "node:path";
import { runCanvaLinuxC420UI } from "../../canva-linux/c420ui-adapter/run.js";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
process.chdir(rootDir);

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  runCanvaLinuxC420UI({
    rootDir,
    argv,
    env: process.env,
  });
}

if (import.meta.url.endsWith(process.argv[1]) || /run-c420ui\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
