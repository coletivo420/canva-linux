import {
  spawnSync,
  type SpawnSyncOptions,
  type SpawnSyncReturns,
} from "node:child_process";
import {
  c420uiRootPolicyExitCode,
  type c420uiAction,
  type c420uiRootProvider,
} from "../../packages/c420ui/src";
import { buildOverviewStatus } from "../core/overview-status";

type RootProviderCommandRunner = (
  command: string,
  args: string[],
  options: SpawnSyncOptions,
) => SpawnSyncReturns<Buffer>;

type CanvaLinuxRootProviderOptions = {
  runCommand?: RootProviderCommandRunner;
};

const conditionalSystemRootActionIds = new Set([
  "purge",
  "uninstall-detected",
]);

function hasUserScope(
  action: c420uiAction,
  actionEnv: NodeJS.ProcessEnv,
): boolean {
  return (
    action.scope === "user" ||
    actionEnv.CANVA_NATIVE_SCOPE === "user" ||
    actionEnv.CANVA_FLATPAK_SCOPE === "user"
  );
}

export function createCanvaLinuxRootProvider(
  options: CanvaLinuxRootProviderOptions = {},
): c420uiRootProvider {
  const runCommand = options.runCommand ?? spawnSync;

  return {
    id: "canva-linux-root-provider",
    label: "Canva Linux root provider",

    buildActionEnvironment(action, baseEnv) {
      return { ...baseEnv, ...(action.env || {}) };
    },

    validateActionScope(action, actionEnv) {
      if (action.requiresRoot === true && hasUserScope(action, actionEnv)) {
        return {
          ok: false,
          code: c420uiRootPolicyExitCode,
          message: `[error] ${action.id}: requiresRoot=true cannot be combined with user scope.`,
        };
      }

      return { ok: true };
    },

    resolveRootPolicy(action, rootDir, actionEnv) {
      void actionEnv;
      if (action.requiresRoot === true) {
        return { requiresRoot: true, reason: `${action.id}: requiresRoot=true` };
      }

      if (conditionalSystemRootActionIds.has(action.id)) {
        try {
          const status = buildOverviewStatus(rootDir);
          if (
            status.installations.nativeSystem ||
            status.installations.flatpakSystem
          ) {
            return {
              requiresRoot: true,
              reason: `${action.id}: detected system installation`,
            };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            requiresRoot: false,
            warning: `[warn] Unable to detect system installations for root policy: ${message}`,
          };
        }
      }

      return { requiresRoot: false };
    },

    validateRootAccess(rootDir, actionEnv) {
      const result = runCommand(
        "bash",
        ["scripts/sudo-common.sh", "--validate"],
        {
          cwd: rootDir,
          stdio: "inherit",
          env: actionEnv,
          shell: false,
        },
      ) as SpawnSyncReturns<Buffer>;

      if (result.error) {
        return {
          ok: false,
          code: 1,
          message: `[error] Failed to start privilege validation: ${result.error.message}`,
        };
      }

      const code = result.status ?? 1;
      if (code !== 0) {
        return {
          ok: false,
          code,
          message: "[error] Privilege validation failed before action execution.",
        };
      }

      return { ok: true };
    },
  };
}

export type { CanvaLinuxRootProviderOptions, RootProviderCommandRunner };
