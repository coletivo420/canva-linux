import { runC420UIRustHost } from "./rust-host.js";

export type C420UIClipboardResult = {
  ok: boolean;
  message: string;
  backend?: string | null;
};

type C420UIClipboardHostOutput = {
  ok?: boolean;
  command?: string;
  backend?: string | null;
  message?: string;
};

export async function copyTextToClipboardWithRust(options: {
  text: string;
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIClipboardResult> {
  if (!options.text.trim()) {
    return {
      ok: false,
      message: "No logs to copy.",
      backend: null,
    };
  }

  try {
    const result = await runC420UIRustHost<C420UIClipboardHostOutput>({
      rootDir: options.rootDir,
      command: "clipboard-write",
      input: {
        text: options.text,
        env: pickClipboardEnv(options.env ?? process.env),
        preferredBackends: ["wayland", "kde", "gnome", "x11"],
      },
      env: options.env,
    });
    return {
      ok: result.ok === true,
      message:
        typeof result.message === "string"
          ? result.message
          : "Clipboard operation did not return a message.",
      backend: result.backend ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Clipboard operation failed: ${formatClipboardError(error)}`,
      backend: null,
    };
  }
}

function pickClipboardEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const output: Record<string, string> = {};
  for (const key of [
    "PATH",
    "WAYLAND_DISPLAY",
    "DISPLAY",
    "XDG_CURRENT_DESKTOP",
    "C420UI_HOST_BIN",
  ]) {
    const value = env[key];
    if (value) output[key] = value;
  }
  return output;
}

function formatClipboardError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.message.replace(/Stderr:.*$/s, "Stderr: <redacted>").trim();
}
