import type { c420uiActionResult } from "./bridge.js";
import type { c420uiLogEvent, c420uiProgressEvent } from "./events.js";
import { c420uiExitCodes } from "./exit-codes.js";
import {
  runC420UIRustHostJsonLines,
  type C420UIRustHostJsonLineEvent,
} from "./rust-host.js";
import { createC420UIOperationalLogEvent } from "./operational-logs.js";

export type C420UIRustProcessOptions = {
  rootDir: string;
  command: string;
  args?: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  label: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  emitLog(event: c420uiLogEvent): void;
  emitProgress(event: c420uiProgressEvent): void;
};

const rustProcessEnvAllowlist = new Set([
  "PATH",
  "HOME",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "TMPDIR",
  "TEMP",
  "TMP",
  "CI",
  "FORCE_COLOR",
  "NO_COLOR",
  "npm_config_cache",
  "npm_config_userconfig",
  "npm_config_prefix",
  "npm_config_loglevel",
  "npm_config_update_notifier",
  "C420UI_HOST_BIN",
]);

export function buildC420UIRustProcessEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  for (const key of rustProcessEnvAllowlist) {
    const value = env[key];
    if (typeof value === "string") safeEnv[key] = value;
  }
  return safeEnv;
}

function emitActionLog(
  options: C420UIRustProcessOptions,
  line: string,
  level: c420uiLogEvent["level"] = "info",
): void {
  options.emitLog(createC420UIOperationalLogEvent({ source: "action", line, level }));
}

function mapEvent(options: C420UIRustProcessOptions, event: C420UIRustHostJsonLineEvent): void {
  if (event.event === "stdout" || event.event === "stderr") {
    options.emitLog(createC420UIOperationalLogEvent({ source: event.event, line: event.line }));
    return;
  }
  if (event.event === "error") {
    emitActionLog(options, `[error] Failed to start ${options.label}: ${event.message}`, "error");
  }
}

export async function runC420UIRustProcess(
  options: C420UIRustProcessOptions,
): Promise<c420uiActionResult> {
  if (options.signal?.aborted) {
    emitActionLog(options, `[action] Cancel requested for ${options.label}`);
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start.",
    };
  }

  emitActionLog(options, `[action] Starting ${options.label}`);
  options.emitProgress({ state: "running", label: options.label });

  let exitCode: number = c420uiExitCodes.generalError;
  let canceled = false;
  let errorMessage: string | undefined;

  try {
    const hostExitCode = await runC420UIRustHostJsonLines({
      rootDir: options.rootDir,
      command: "run-process",
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      env: options.env,
      input: {
        command: options.command,
        args: options.args ?? [],
        cwd: options.cwd,
        env: buildC420UIRustProcessEnv(options.env),
        label: options.label,
      },
      onEvent(event) {
        mapEvent(options, event);
        if (event.event === "exit") exitCode = event.code;
        if (event.event === "canceled") {
          canceled = true;
          errorMessage = event.message;
        }
        if (event.event === "error") {
          errorMessage = event.message;
        }
      },
    });
    if (exitCode === c420uiExitCodes.generalError && hostExitCode !== c420uiExitCodes.success) {
      exitCode = hostExitCode;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitActionLog(options, `[error] Failed to start ${options.label}: ${message}`, "error");
    options.emitProgress({ state: "failed", label: options.label });
    return { code: c420uiExitCodes.generalError, status: "failed", message };
  }

  if (canceled || options.signal?.aborted || exitCode === c420uiExitCodes.canceled) {
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: errorMessage ?? "Action canceled.",
    };
  }

  const success = exitCode === c420uiExitCodes.success;
  if (!success) {
    emitActionLog(options, `[error] ${options.label} exited with code ${exitCode}`, "error");
  }
  options.emitProgress({
    state: success ? "success" : "failed",
    percent: success ? 100 : undefined,
    label: options.label,
  });

  return {
    code: exitCode,
    status: success ? "success" : "failed",
    message: errorMessage,
  };
}
