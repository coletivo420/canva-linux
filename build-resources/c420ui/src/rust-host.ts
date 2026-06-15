import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type C420UIRustHostCommand =
  | "host-info"
  | "doctor"
  | "check-host-dependencies";

export type C420UIRustHostRunOptions = {
  rootDir: string;
  command: C420UIRustHostCommand;
  input?: unknown;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

export async function runC420UIRustHost<T>(
  options: C420UIRustHostRunOptions,
): Promise<T> {
  const { rootDir, command, input, timeoutMs = 10000, env = {} } = options;

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

  const childEnv: Record<string, string> = {};
  if (env.PATH) {
    childEnv.PATH = env.PATH;
  } else if (process.env.PATH) {
    childEnv.PATH = process.env.PATH;
  }

  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }

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

    child.stdin.write(JSON.stringify(input ?? {}) + "\n");
    child.stdin.end();
  });
}
