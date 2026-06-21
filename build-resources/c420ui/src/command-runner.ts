import type { c420uiActionResult } from "./bridge.js";
import type { c420uiLogEvent, c420uiProgressEvent } from "./events.js";
import {
  runC420UIRustProcess,
  type C420UIRustProcessOptions,
} from "./rust-process-runner.js";

export type c420uiCommandProcessRunner = (
  options: C420UIRustProcessOptions,
) => Promise<c420uiActionResult>;

export type c420uiCommandRunnerOptions = {
  command: string;
  args?: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  label: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  processRunner?: c420uiCommandProcessRunner;
  emitLog(event: c420uiLogEvent): void;
  emitProgress(event: c420uiProgressEvent): void;
};

export async function runC420UICommand(
  options: c420uiCommandRunnerOptions,
): Promise<c420uiActionResult> {
  const processRunner = options.processRunner ?? runC420UIRustProcess;
  return processRunner({
    rootDir: options.cwd,
    command: options.command,
    args: options.args ?? [],
    cwd: options.cwd,
    env: options.env,
    label: options.label,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress,
  });
}
