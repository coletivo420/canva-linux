import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import fs from "node:fs";
import path from "node:path";

export type C420UIRustHostCommand =
  | "host-info"
  | "doctor"
  | "check-host-dependencies"
  | "project-config"
  | "clipboard-write"
  | "sudo-validate"
  | "remove-paths"
  | "fix-permissions"
  | "fs-ops"
  | "ensure-linux-unpacked"
  | "artifact-file-ops";

export type C420UIRustHostRunOptions = {
  rootDir: string;
  command: C420UIRustHostCommand;
  input?: unknown;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

export type C420UIRustHostJsonLineEvent =
  | { event: "started"; pid: number }
  | { event: "stdout"; line: string }
  | { event: "stderr"; line: string }
  | { event: "exit"; code: number }
  | { event: "error"; message: string }
  | { event: "canceled"; message: string };

export type C420UIRustHostJsonLinesOptions = {
  rootDir: string;
  command: "run-process";
  input: unknown;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onEvent(event: C420UIRustHostJsonLineEvent): void;
};

function resolveC420UIRustHostBinary(rootDir: string, env: NodeJS.ProcessEnv = {}): string {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";

  if (!binPath) {
    const debugPath = path.join(rootDir, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path.join(rootDir, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs.existsSync(debugPath)) {
      binPath = debugPath;
    } else if (fs.existsSync(releasePath)) {
      binPath = releasePath;
    }
  }

  if (!binPath || !fs.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}

function buildRustHostProcessEnv(env: NodeJS.ProcessEnv = {}): Record<string, string> {
  const childEnv: Record<string, string> = {};
  if (env.PATH) {
    childEnv.PATH = env.PATH;
  } else if (process.env.PATH) {
    childEnv.PATH = process.env.PATH;
  }

  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}

export async function runC420UIRustHost<T>(
  options: C420UIRustHostRunOptions,
): Promise<T> {
  const { rootDir, command, input, timeoutMs = 10000, env = {} } = options;
  const binPath = resolveC420UIRustHostBinary(rootDir, env);
  const childEnv = buildRustHostProcessEnv(env);

  return new Promise<T>((resolve, reject) => {
    const child = spawn(binPath, [command, "--json"], {
      env: childEnv,
      shell: false,
    });

    let stdoutData = "";
    let stderrData = "";
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill();
      clearTimeout(timer);
      reject(new Error(`c420ui-host command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.stdin.on("error", (err) => {
      // Ignore EPIPE as we handle process exit in 'close'
      if ((err as any).code !== "EPIPE") {
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killedByTimeout) return;

      if (code !== 0) {
        reject(
          new Error(
            `c420ui-host exited with code ${code}. Stderr: ${stderrData.slice(0, 500).trim()}`,
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdoutData.trim()) as T;
        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse c420ui-host output as JSON."));
      }
    });

    try {
      child.stdin.write(JSON.stringify(input ?? {}) + "\n");
      child.stdin.end();
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

function parseJsonLine(line: string): C420UIRustHostJsonLineEvent {
  try {
    const parsed = JSON.parse(line) as C420UIRustHostJsonLineEvent;
    if (!parsed || typeof parsed !== "object" || !("event" in parsed)) {
      throw new Error("missing event field");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSONL event from c420ui-host: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

export async function runC420UIRustHostJsonLines(
  options: C420UIRustHostJsonLinesOptions,
): Promise<number> {
  const { rootDir, input, timeoutMs = 0, env = {}, signal, onEvent } = options;
  const binPath = resolveC420UIRustHostBinary(rootDir, env);
  const childEnv = buildRustHostProcessEnv(env);

  return new Promise<number>((resolve, reject) => {
    const child = spawn(binPath, ["run-process", "--json-lines"], {
      env: childEnv,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutPending = "";
    let stderrData = "";
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;
    const decoder = new StringDecoder("utf8");

    function settle(error: Error | null, code = 0): void {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(code);
    }

    function abort(): void {
      try {
        child.stdin.write(JSON.stringify({ event: "cancel" }) + "\n");
      } catch {}
      if (timeoutMs > 0) {
        setTimeout(() => {
          if (!settled) child.kill();
        }, Math.min(timeoutMs, 1000)).unref();
      }
    }

    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill();
        settle(new Error(`c420ui-host run-process timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timeout.unref();
    }

    child.on("error", (error) => settle(error));
    child.stderr.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString();
    });
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutPending += decoder.write(chunk);
      const lines = stdoutPending.split(/\r?\n/);
      stdoutPending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEvent(parseJsonLine(line));
        } catch (error) {
          settle(error instanceof Error ? error : new Error(String(error)));
          child.kill();
          return;
        }
      }
    });
    child.stdout.on("end", () => {
      stdoutPending += decoder.end();
      const line = stdoutPending.trim();
      if (!line) return;
      try {
        onEvent(parseJsonLine(line));
      } catch (error) {
        settle(error instanceof Error ? error : new Error(String(error)));
      }
    });
    child.on("close", (code) => {
      if (settled) return;
      if (stderrData.trim() && code !== 0) {
        stderrData = stderrData.slice(0, 500);
      }
      settle(null, code ?? 1);
    });

    signal?.addEventListener("abort", abort, { once: true });
    try {
      child.stdin.write(JSON.stringify(input) + "\n");
    } catch (error) {
      settle(error instanceof Error ? error : new Error(String(error)));
    }
    if (signal?.aborted) {
      abort();
    }
  });
}
