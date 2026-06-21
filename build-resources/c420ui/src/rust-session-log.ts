import { runC420UIRustHost } from "./rust-host.js";

export type C420UIRustSessionLogResponse = {
  ok: boolean;
  command: string;
  path: string;
  text?: string;
  diagnostics: Array<{ level: string; code: string; message: string }>;
};

export function readC420UIRustSessionLog(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSessionLogResponse> {
  return runC420UIRustHost<C420UIRustSessionLogResponse>({
    rootDir: options.rootDir,
    command: "session-log-read",
    input: {},
    env: options.env,
  });
}

export function writeC420UIRustSessionLog(options: {
  rootDir: string;
  text: string;
  append?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSessionLogResponse> {
  return runC420UIRustHost<C420UIRustSessionLogResponse>({
    rootDir: options.rootDir,
    command: "session-log-write",
    input: { text: options.text, append: options.append ?? false },
    env: options.env,
  });
}

export function clearC420UIRustSessionLog(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSessionLogResponse> {
  return runC420UIRustHost<C420UIRustSessionLogResponse>({
    rootDir: options.rootDir,
    command: "session-log-clear",
    input: {},
    env: options.env,
  });
}
