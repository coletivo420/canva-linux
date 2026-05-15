import path from "node:path";
import { runCanvaLinuxC420UI } from "./c420ui-adapter/run";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
process.chdir(rootDir);

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  runCanvaLinuxC420UI({
    rootDir,
    argv,
    env: process.env,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
