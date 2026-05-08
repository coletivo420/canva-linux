import {
  assertC420UIActionContract,
  getC420UIActionCliFlags,
  isC420UIPlannedAction,
  requiresC420UIActionConfirmation,
  type c420uiAction,
} from "./actions";
import type {
  c420uiActionResult,
  c420uiExecutionContext,
  c420uiProjectBridge,
} from "./bridge";
import { createC420UIEvent, type C420UIEventSink } from "./events";
import { c420uiExitCodes } from "./exit-codes";
import type { c420uiRootProvider } from "./root-provider";

export type c420uiActionEngineOptions = {
  bridge: c420uiProjectBridge;
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  emit?: C420UIEventSink;
  rootProvider?: c420uiRootProvider;
};

export type c420uiRunActionOptions = {
  dryRun?: boolean;
  yes?: boolean;
};

export type c420uiActionResolution =
  | { found: true; action: c420uiAction }
  | { found: false; reason: "not-found"; query: string };

export function createC420UIActionEngine(
  options: c420uiActionEngineOptions,
) {
  const { bridge, rootDir, emit, rootProvider } = options;

  function listActions(): c420uiAction[] {
    return bridge.actions();
  }

  function resolveActionById(actionId: string): c420uiActionResolution {
    const action = listActions().find((candidate) => candidate.id === actionId);
    return action
      ? { found: true, action }
      : { found: false, reason: "not-found", query: actionId };
  }

  function resolveActionByCliFlag(flag: string): c420uiActionResolution {
    const action = listActions().find((candidate) =>
      getC420UIActionCliFlags(candidate).includes(flag),
    );
    return action
      ? { found: true, action }
      : { found: false, reason: "not-found", query: flag };
  }

  async function runActionById(
    actionId: string,
    runOptions: c420uiRunActionOptions = {},
  ): Promise<c420uiActionResult> {
    const resolution = resolveActionById(actionId);
    if (!resolution.found) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`,
      };
    }

    return runAction(resolution.action, runOptions);
  }

  async function runAction(
    action: c420uiAction,
    runOptions: c420uiRunActionOptions = {},
  ): Promise<c420uiActionResult> {
    assertC420UIActionContract(action);
    const dryRun = runOptions.dryRun === true;
    const yes = runOptions.yes === true;

    if (dryRun) {
      emit?.(
        createC420UIEvent({
          type: "action:start",
          actionId: action.id,
          message: action.label,
          data: { dryRun },
        }),
      );
      const result: c420uiActionResult = {
        code: c420uiExitCodes.success,
        status: "success",
        message: "dry-run",
      };
      emit?.(
        createC420UIEvent({
          type: "action:finish",
          actionId: action.id,
          message: action.label,
          data: { exitCode: result.code, status: result.status },
        }),
      );
      return result;
    }

    if (isC420UIPlannedAction(action)) {
      emit?.(
        createC420UIEvent({
          type: "action:planned",
          actionId: action.id,
          message: action.description ?? action.label,
        }),
      );
      return {
        code: c420uiExitCodes.plannedAction,
        status: "planned",
        message: action.description,
      };
    }

    if (requiresC420UIActionConfirmation(action) && !yes) {
      return {
        code: c420uiExitCodes.generalError,
        status: "failed",
        message: `[error] Action requires confirmation: ${action.label}\n[info] Re-run with --yes after confirming intent.`,
      };
    }

    const baseEnv = options.env ?? process.env;
    const actionEnv = rootProvider
      ? rootProvider.buildActionEnvironment(action, baseEnv)
      : baseEnv;

    if (rootProvider) {
      const scopeResult = rootProvider.validateActionScope(action, actionEnv);
      if (scopeResult.ok === false) {
        return {
          code: scopeResult.code,
          status: "failed",
          message: scopeResult.message,
        };
      }

      const rootPolicy = rootProvider.resolveRootPolicy(
        action,
        rootDir,
        actionEnv,
      );
      if (rootPolicy.requiresRoot === false && rootPolicy.warning) {
        emit?.(
          createC420UIEvent({
            type: "log",
            source: "system",
            line: rootPolicy.warning,
          }),
        );
      }
      if (rootPolicy.requiresRoot) {
        const access = rootProvider.validateRootAccess(rootDir, actionEnv);
        if (access.ok === false) {
          return {
            code: access.code,
            status: "failed",
            message: access.message,
          };
        }
      }
    }

    emit?.(
      createC420UIEvent({
        type: "action:start",
        actionId: action.id,
        message: action.label,
        data: { dryRun },
      }),
    );

    const context: c420uiExecutionContext = {
      rootDir,
      dryRun,
      yes,
      env: actionEnv,
      emitLog(event) {
        emit?.(createC420UIEvent({ type: "log", ...event }));
      },
      emitProgress(event) {
        emit?.(createC420UIEvent({ type: "progress", ...event }));
      },
    };
    const result = await bridge.runAction(action.id, context);

    emit?.(
      createC420UIEvent({
        type: "action:finish",
        actionId: action.id,
        message: action.label,
        data: { exitCode: result.code, status: result.status },
      }),
    );

    return result;
  }

  return {
    listActions,
    resolveActionById,
    resolveActionByCliFlag,
    runActionById,
    runAction,
  };
}
