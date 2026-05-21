import {
  createC420UIActionEngine,
  type c420uiRootAccessRequester,
} from "../action-engine";
import { requiresC420UIActionConfirmation, type c420uiAction } from "../actions";
import { c420uiExitCodes } from "../exit-codes";
import type { c420uiActionResult, c420uiProjectBridge } from "../bridge";
import type { C420UIEvent, c420uiLogSource } from "../events";
import type { c420uiRootProvider } from "../root-provider";

export type InteractiveProgressState =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "failed"
  | "canceled";

export type InteractiveActionRunnerState = {
  running: boolean;
  progressState: InteractiveProgressState;
  lastResult?: c420uiActionResult;
};

type InteractiveActionRunnerOptions = {
  bridge: c420uiProjectBridge;
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  rootProvider?: c420uiRootProvider;
  requestRootAccess?: c420uiRootAccessRequester;
  createActionEngine?: typeof createC420UIActionEngine;
  appendLogText(text: string, source: c420uiLogSource): void;
  setProgress(
    state: InteractiveProgressState,
    percent: number | undefined,
    label: string,
  ): void;
  setRunning(running: boolean): void;
};

type InteractiveRunActionOptions = {
  confirmed?: boolean;
  dryRun?: boolean;
};

function toProgressState(state: string | undefined): InteractiveProgressState {
  if (
    state === "idle" ||
    state === "running" ||
    state === "success" ||
    state === "warning" ||
    state === "failed" ||
    state === "canceled"
  ) {
    return state;
  }
  return "running";
}

export function interactiveActionRequiresConfirmation(
  action: c420uiAction,
): boolean {
  return requiresC420UIActionConfirmation(action);
}

export function createInteractiveActionRunner(
  options: InteractiveActionRunnerOptions,
) {
  const state: InteractiveActionRunnerState = {
    running: false,
    progressState: "idle",
  };
  let activeAbortController: AbortController | null = null;

  function applyEvent(event: C420UIEvent) {
    if (event.type === "log") {
      options.appendLogText(`${event.line}\n`, event.source);
      return;
    }

    if (event.type === "progress") {
      const nextState = toProgressState(event.state);
      state.progressState = nextState;
      options.setProgress(
        nextState,
        event.percent,
        event.label ?? nextState,
      );
      return;
    }

    if (event.type === "action:start") {
      state.running = true;
      state.progressState = "running";
      options.setRunning(true);
      options.setProgress("running", 5, event.message || "Starting");
      return;
    }

    if (event.type === "action:planned") {
      state.progressState = "warning";
      options.appendLogText(
        `[planned] ${event.message}\n`,
        "system",
      );
      options.setProgress("warning", 100, "Planned action");
      return;
    }

    if (event.type === "action:finish") {
      const status = event.data?.status;
      const exitCode = event.data?.exitCode;
      const success = status === "success" || exitCode === c420uiExitCodes.success;
      const canceled = status === "canceled";
      state.running = false;
      state.progressState = canceled ? "canceled" : success ? "success" : "failed";
      options.setRunning(false);
      options.setProgress(
        state.progressState,
        success ? 100 : 0,
        canceled
          ? "Canceled"
          : success
            ? "Completed"
            : `exit code ${String(exitCode ?? "unknown")}`,
      );
    }
  }

  const makeEngine = options.createActionEngine ?? createC420UIActionEngine;
  const engine = makeEngine({
    bridge: options.bridge,
    rootDir: options.rootDir,
    env: options.env,
    rootProvider: options.rootProvider,
    requestRootAccess: options.requestRootAccess,
    emit: applyEvent,
  });

  async function runAction(
    action: c420uiAction,
    runOptions: InteractiveRunActionOptions = {},
  ): Promise<c420uiActionResult> {
    const dryRun = runOptions.dryRun === true;
    const confirmed = runOptions.confirmed === true;

    if (!dryRun && interactiveActionRequiresConfirmation(action) && !confirmed) {
      const result: c420uiActionResult = {
        code: c420uiExitCodes.generalError,
        status: "canceled",
        message: "Action canceled before execution.",
      };
      state.running = false;
      state.progressState = "canceled";
      options.setRunning(false);
      options.setProgress("canceled", 0, "Canceled");
      options.appendLogText("[info] Action canceled before execution.\n", "system");
      state.lastResult = result;
      return result;
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    try {
      const result = await engine.runAction(action, {
        dryRun,
        yes: confirmed,
        signal: abortController.signal,
      });
      state.lastResult = result;

      if (result.status === "failed" && result.message) {
        options.appendLogText(`${result.message}\n`, "system");
        state.progressState = "failed";
        options.setRunning(false);
        options.setProgress("failed", 0, result.message);
      }

      return result;
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  }

  function cancel(): boolean {
    if (!activeAbortController || activeAbortController.signal.aborted) {
      return false;
    }
    activeAbortController.abort();
    options.appendLogText("[info] Cancellation requested.\n", "system");
    state.progressState = "canceled";
    options.setProgress("canceled", 0, "Canceled");
    return true;
  }

  return {
    cancel,
    runAction,
    state,
  };
}
