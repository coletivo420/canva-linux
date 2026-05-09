import path from "node:path";
import { isC420UIHostDependencyFailure } from "../packages/c420ui/src";
import { createCanvaLinuxHostDependencyProvider } from "./c420ui-canva-linux/host-dependencies";
import { runCanvaLinuxC420UI } from "./c420ui-canva-linux/run";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
process.chdir(rootDir);

async function ensureHostDependencies(): Promise<void> {
  const hostDependencies = createCanvaLinuxHostDependencyProvider({
    rootDir,
    env: process.env,
  });
  const result = hostDependencies.ensure
    ? await hostDependencies.ensure()
    : undefined;

  if (result && isC420UIHostDependencyFailure(result)) {
    console.error(result.message || "Failed to ensure host dependencies.");
    process.exit(result.exitCode ?? 1);
  }
}

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (!argv.includes("--help")) {
    await ensureHostDependencies();
  }

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
