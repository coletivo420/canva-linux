import { spawn, type ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type { c420uiActionResult } from "./bridge";
import type { c420uiLogEvent, c420uiProgressEvent } from "./events";
import { c420uiExitCodes } from "./exit-codes";
import { createC420UIOperationalLogEvent } from "./operational-logs";

export type c420uiCommandRunnerOptions = {
  command: string;
  args?: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  label: string;
  signal?: AbortSignal;
  cancelSignal?: NodeJS.Signals;
  cancelKillSignal?: NodeJS.Signals;
  cancelKillTimeoutMs?: number;
  spawnCommand?: typeof spawn;
  emitLog(event: c420uiLogEvent): void;
  emitProgress(event: c420uiProgressEvent): void;
};

type DecodedStreamState = {
  decoder: StringDecoder;
  pending: string;
};

function emitOperationalLog(
  options: c420uiCommandRunnerOptions,
  event: Parameters<typeof createC420UIOperationalLogEvent>[0],
): void {
  options.emitLog(createC420UIOperationalLogEvent(event));
}

function emitDecodedChunk(
  stream: DecodedStreamState,
  chunk: Buffer,
  source: c420uiLogEvent["source"],
  emitLog: (event: c420uiLogEvent) => void,
): void {
  stream.pending += stream.decoder.write(chunk);
  const lines = stream.pending.split(/\r?\n/);
  stream.pending = lines.pop() ?? "";
  for (const line of lines) {
    emitLog(createC420UIOperationalLogEvent({ source, line }));
  }
}

function emitRemainingChunk(
  stream: DecodedStreamState,
  source: c420uiLogEvent["source"],
  emitLog: (event: c420uiLogEvent) => void,
): void {
  stream.pending += stream.decoder.end();
  if (stream.pending) {
    emitLog(createC420UIOperationalLogEvent({ source, line: stream.pending }));
  }
  stream.pending = "";
}

export async function runC420UICommand(
  options: c420uiCommandRunnerOptions,
): Promise<c420uiActionResult> {
  const spawnCommand = options.spawnCommand ?? spawn;
  const args = options.args ?? [];
  const stdoutStream = { decoder: new StringDecoder("utf8"), pending: "" };
  const stderrStream = { decoder: new StringDecoder("utf8"), pending: "" };
  const cancelSignal = options.cancelSignal ?? "SIGINT";
  const cancelKillSignal = options.cancelKillSignal ?? "SIGTERM";
  const cancelKillTimeoutMs = options.cancelKillTimeoutMs ?? 5000;

  if (options.signal?.aborted) {
    emitOperationalLog(options, {
      source: "action",
      line: `[action] Cancel requested for ${options.label}`,
      level: "info",
    });
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start.",
    };
  }

  return new Promise<c420uiActionResult>((resolve) => {
    let settled = false;
    let closeObserved = false;
    let canceledProgressEmitted = false;
    let cancelKillTimer: NodeJS.Timeout | undefined;
    let child: ChildProcess;

    function emitCanceledProgress(): void {
      if (canceledProgressEmitted) return;
      canceledProgressEmitted = true;
      options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    }

    function clearCancelKillTimer(): void {
      if (!cancelKillTimer) return;
      clearTimeout(cancelKillTimer);
      cancelKillTimer = undefined;
    }

    function settle(result: c420uiActionResult): void {
      if (settled) return;
      settled = true;
      clearCancelKillTimer();
      options.signal?.removeEventListener("abort", abortAction);
      resolve(result);
    }

    function abortAction(): void {
      emitOperationalLog(options, {
        source: "action",
        line: `[action] Cancel requested for ${options.label}`,
        level: "info",
      });
      emitCanceledProgress();
      child.kill(cancelSignal);
      cancelKillTimer = setTimeout(() => {
        if (!closeObserved) child.kill(cancelKillSignal);
      }, cancelKillTimeoutMs);
      cancelKillTimer.unref?.();
    }

    emitOperationalLog(options, {
      source: "action",
      line: `[action] Starting ${options.label}`,
      level: "info",
    });
    options.emitProgress({ state: "running", label: options.label });

    try {
      child = spawnCommand(options.command, args, {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${message}`,
        level: "error",
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message });
      return;
    }

    options.signal?.addEventListener("abort", abortAction, { once: true });

    child.stdout?.on("data", (chunk: Buffer) => {
      emitDecodedChunk(stdoutStream, chunk, "stdout", options.emitLog);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      emitDecodedChunk(stderrStream, chunk, "stderr", options.emitLog);
    });
    child.stdout?.on("end", () => {
      emitRemainingChunk(stdoutStream, "stdout", options.emitLog);
    });
    child.stderr?.on("end", () => {
      emitRemainingChunk(stderrStream, "stderr", options.emitLog);
    });
    child.on("error", (error) => {
      if (settled) return;
      if (options.signal?.aborted) {
        settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
        return;
      }
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${error.message}`,
        level: "error",
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      closeObserved = true;
      clearCancelKillTimer();
      if (options.signal?.aborted || signal === cancelSignal || signal === cancelKillSignal) {
        emitCanceledProgress();
        settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
        return;
      }
      const resultCode = code ?? c420uiExitCodes.generalError;
      const success = resultCode === c420uiExitCodes.success;
      if (!success) {
        emitOperationalLog(options, {
          source: "action",
          line: `[error] ${options.label} exited with code ${resultCode}`,
          level: "error",
        });
      }
      options.emitProgress({
        state: success ? "success" : "failed",
        percent: success ? 100 : undefined,
        label: options.label,
      });
      settle({
        code: resultCode,
        status: success ? "success" : "failed",
      });
    });
  });
}
