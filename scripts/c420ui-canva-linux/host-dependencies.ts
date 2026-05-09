import { spawnSync } from "node:child_process";
import type {
  c420uiHostDependencyCheckResult,
  c420uiHostDependencyProvider,
} from "../../packages/c420ui/src";

export type CanvaLinuxHostDependencyProviderOptions = {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: typeof spawnSync;
};

export function createCanvaLinuxHostDependencyProvider(
  options: CanvaLinuxHostDependencyProviderOptions,
): c420uiHostDependencyProvider {
  const runCommand = options.runCommand ?? spawnSync;

  return {
    id: "canva-linux-host-dependencies",
    label: "Canva Linux host dependencies",

    check(): c420uiHostDependencyCheckResult {
      return {
        status: "available",
        message: "Host dependency check is delegated to ensure().",
      };
    },

    ensure(): c420uiHostDependencyCheckResult {
      const result = runCommand("bash", ["scripts/ensure-npm-dependencies.sh"], {
        cwd: options.rootDir,
        env: options.env ?? process.env,
        stdio: "inherit",
        shell: false,
      });

      if (result.error) {
        return {
          status: "failed",
          exitCode: 1,
          message: result.error.message,
        };
      }

      const code = result.status ?? 1;
      return code === 0
        ? { status: "available" }
        : {
            status: "failed",
            exitCode: code,
            message: "Failed to ensure host dependencies.",
          };
    },
  };
}
