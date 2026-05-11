import {
  spawnSync,
  type SpawnSyncOptions,
  type SpawnSyncReturns,
} from "node:child_process";
import type { c420uiAction } from "./actions";
import {
  c420uiRootPolicyExitCode,
  type c420uiRootProvider,
  type c420uiRootValidationResult,
} from "./root-provider";
import { isC420UIUserScope } from "./scopes";

export type c420uiLinuxRootCommandRunner = (
  command: string,
  args: string[],
  options: SpawnSyncOptions,
) => SpawnSyncReturns<Buffer>;

export type c420uiLinuxActionScopePredicate = (
  action: c420uiAction,
  actionEnv: NodeJS.ProcessEnv,
) => boolean;

export type c420uiLinuxRootValidationCommand = {
  command: string;
  args: string[];
};

export type c420uiLinuxRootValidationCommandBuilder = (
  sudoHelperPath: string,
) => c420uiLinuxRootValidationCommand;

export function defaultC420UILinuxRootValidationCommand(
  sudoHelperPath: string,
): c420uiLinuxRootValidationCommand {
  return { command: "bash", args: [sudoHelperPath, "--validate"] };
}

export function defaultC420UILinuxRootValidationStdinCommand(
  sudoHelperPath: string,
): c420uiLinuxRootValidationCommand {
  return { command: "bash", args: [sudoHelperPath, "--validate-stdin"] };
}

export type c420uiLinuxRootProviderBaseOptions = {
  id?: string;
  label?: string;
  sudoHelperPath: string;
  rootAuthEnvKey?: string;
  rootAuthEnvValue?: string;
  runCommand?: c420uiLinuxRootCommandRunner;
  buildRootValidationCommand?: c420uiLinuxRootValidationCommandBuilder;
  buildRootValidationStdinCommand?: c420uiLinuxRootValidationCommandBuilder;
  buildActionEnvironment?: (
    action: c420uiAction,
    baseEnv: NodeJS.ProcessEnv,
  ) => NodeJS.ProcessEnv;
  actionHasUserScope?: c420uiLinuxActionScopePredicate;
};

export function defaultC420UILinuxBuildActionEnvironment(
  action: c420uiAction,
  baseEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return { ...baseEnv, ...(action.env || {}) };
}

export function defaultC420UILinuxActionHasUserScope(
  action: c420uiAction,
  actionEnv: NodeJS.ProcessEnv = {},
): boolean {
  void actionEnv;
  return isC420UIUserScope(action.scope);
}

export function validateC420UILinuxActionScope(
  action: c420uiAction,
  actionEnv: NodeJS.ProcessEnv,
  actionHasUserScope: c420uiLinuxActionScopePredicate =
    defaultC420UILinuxActionHasUserScope,
): c420uiRootValidationResult {
  if (action.requiresRoot === true && actionHasUserScope(action, actionEnv)) {
    return {
      ok: false,
      code: c420uiRootPolicyExitCode,
      message: `[error] ${action.id}: requiresRoot=true cannot be combined with user scope.`,
    };
  }

  return { ok: true };
}

export function createC420UILinuxRootProviderBase(
  options: c420uiLinuxRootProviderBaseOptions,
): Pick<
  c420uiRootProvider,
  | "id"
  | "label"
  | "buildActionEnvironment"
  | "validateActionScope"
  | "validateRootAccess"
  | "validateRootAccessWithInput"
  | "buildRootActionEnvironment"
> {
  const runCommand = options.runCommand ?? spawnSync;
  const buildActionEnvironment =
    options.buildActionEnvironment ?? defaultC420UILinuxBuildActionEnvironment;
  const actionHasUserScope =
    options.actionHasUserScope ?? defaultC420UILinuxActionHasUserScope;
  const buildRootValidationCommand =
    options.buildRootValidationCommand ??
    defaultC420UILinuxRootValidationCommand;
  const buildRootValidationStdinCommand =
    options.buildRootValidationStdinCommand ??
    defaultC420UILinuxRootValidationStdinCommand;

  return {
    id: options.id ?? "c420ui-linux-root-provider-base",
    label: options.label ?? "c420ui Linux root provider base",

    buildActionEnvironment(action, baseEnv) {
      return buildActionEnvironment(action, baseEnv);
    },

    validateActionScope(action, actionEnv) {
      return validateC420UILinuxActionScope(
        action,
        actionEnv,
        actionHasUserScope,
      );
    },

    validateRootAccess(rootDir, actionEnv) {
      const validationCommand = buildRootValidationCommand(
        options.sudoHelperPath,
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir,
        stdio: "inherit",
        env: actionEnv,
        shell: false,
      }) as SpawnSyncReturns<Buffer>;

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

    validateRootAccessWithInput(rootDir, actionEnv, input) {
      const validationCommand = buildRootValidationStdinCommand(
        options.sudoHelperPath,
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir,
        env: actionEnv,
        shell: false,
        input: `${input}\n`,
        stdio: ["pipe", "pipe", "pipe"],
      });

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

    buildRootActionEnvironment(_action, actionEnv) {
      if (!options.rootAuthEnvKey) return { ...actionEnv };
      return {
        ...actionEnv,
        [options.rootAuthEnvKey]: options.rootAuthEnvValue ?? "1",
      };
    },
  };
}
