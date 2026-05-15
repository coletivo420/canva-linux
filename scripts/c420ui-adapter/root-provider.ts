import {
  createC420UILinuxRootProviderBase,
  isC420UIUserScope,
  type c420uiAction,
  type c420uiLinuxRootCommandRunner,
  type c420uiRootProvider,
} from "../../packages/c420ui/src";
import { buildCanvaLinuxOverviewStatus } from "../canva-linux/detection/provider";

type CanvaLinuxRootProviderOptions = {
  runCommand?: c420uiLinuxRootCommandRunner;
};

const conditionalSystemRootActionIds = new Set([
  "purge",
  "uninstall-detected",
]);

function buildCanvaLinuxRootActionEnvironment(
  action: c420uiAction,
  baseEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const env = {
    ...baseEnv,
    ...(action.env || {}),
  };

  if (env.CANVA_NATIVE_SCOPE === "user" || env.CANVA_FLATPAK_SCOPE === "user") {
    env.C420UI_ACTION_SCOPE = "user";
  } else if (
    env.CANVA_NATIVE_SCOPE === "system" ||
    env.CANVA_FLATPAK_SCOPE === "system" ||
    action.scope === "system"
  ) {
    env.C420UI_ACTION_SCOPE = "system";
  } else if (action.scope) {
    env.C420UI_ACTION_SCOPE = action.scope;
  }

  return env;
}

function hasCanvaLinuxUserScope(
  action: c420uiAction,
  actionEnv: NodeJS.ProcessEnv,
): boolean {
  return (
    isC420UIUserScope(action.scope) ||
    actionEnv.CANVA_NATIVE_SCOPE === "user" ||
    actionEnv.CANVA_FLATPAK_SCOPE === "user"
  );
}

export function createCanvaLinuxRootProvider(
  options: CanvaLinuxRootProviderOptions = {},
): c420uiRootProvider {
  const base = createC420UILinuxRootProviderBase({
    id: "canva-linux-root-provider",
    label: "Canva Linux root provider",
    sudoHelperPath: "packages/c420ui/host/linux/sudo-helper.sh",
    rootAuthEnvKey: "C420UI_ROOT_AUTH",
    rootAuthEnvValue: "1",
    runCommand: options.runCommand,
    buildActionEnvironment: buildCanvaLinuxRootActionEnvironment,
    actionHasUserScope: hasCanvaLinuxUserScope,
  });

  return {
    ...base,

    resolveRootPolicy(action, rootDir, actionEnv) {
      void actionEnv;
      if (action.requiresRoot === true) {
        return { requiresRoot: true, reason: `${action.id}: requiresRoot=true` };
      }

      if (conditionalSystemRootActionIds.has(action.id)) {
        try {
          const status = buildCanvaLinuxOverviewStatus(rootDir);
          if (
            status.installations.nativeSystem ||
            status.installations.flatpakSystem
          ) {
            return {
              requiresRoot: true,
              reason: `${action.id}: detected system installation`,
            };
          }
          if (status.warnings.length) {
            return {
              requiresRoot: false,
              warning: `[warn] Unable to detect system installations for root policy: ${status.warnings.join("; ")}`,
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
  };
}

export type { CanvaLinuxRootProviderOptions };
