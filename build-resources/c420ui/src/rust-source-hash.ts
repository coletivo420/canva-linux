import { runC420UIRustHost } from "./rust-host.js";

export type C420UIRustSourceHashScope = "c420ui" | "dependent-project" | "combined";

export type C420UIRustSourceHashResponse = {
  ok: boolean;
  command: "source-hash";
  scope: C420UIRustSourceHashScope;
  hash: string;
  diagnostics: Array<{ level: string; code: string; message: string }>;
};

export function calculateC420UIRustSourceHash(options: {
  rootDir: string;
  scope?: C420UIRustSourceHashScope;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSourceHashResponse> {
  return runC420UIRustHost<C420UIRustSourceHashResponse>({
    rootDir: options.rootDir,
    command: "source-hash",
    input: {
      rootDir: options.rootDir,
      scope: options.scope ?? "c420ui",
    },
    timeoutMs: 30000,
    env: options.env,
  });
}
