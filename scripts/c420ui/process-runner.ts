// Legacy process runner kept temporarily until operational logger migration.
import { spawn, type ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

export type StreamSource = "stdout" | "stderr";

export type ProcessCloseResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export type RunActionOptions = {
  cwd?: string;
  env?: Record<string, string>;
};

export function runAction(
  command: string,
  args: string[],
  onData: (text: string, source: StreamSource) => void,
  onClose: (result: ProcessCloseResult) => void,
  options: RunActionOptions = {},
): ChildProcess {
  const child = spawn(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
    shell: false,
  });

  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  child.stdout?.on("data", (chunk: Buffer) => {
    onData(stdoutDecoder.write(chunk), "stdout");
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    onData(stderrDecoder.write(chunk), "stderr");
  });

  child.stdout?.on("end", () => {
    const remaining = stdoutDecoder.end();
    if (remaining) {
      onData(remaining, "stdout");
    }
  });

  child.stderr?.on("end", () => {
    const remaining = stderrDecoder.end();
    if (remaining) {
      onData(remaining, "stderr");
    }
  });

  child.on("close", (code, signal) => {
    onClose({
      code,
      signal,
    });
  });

  child.on("error", (err) => {
    onData(`[error] ${String(err)}\n`, "stderr");
  });

  return child;
}
