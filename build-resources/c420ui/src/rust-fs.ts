import { runC420UIRustHost } from "./rust-host.js";

export type c420uiRustFsOperation =
  | { kind: "ensure-dir"; path: string }
  | { kind: "copy-tree"; from: string; to: string }
  | { kind: "copy-file"; from: string; to: string; mode?: number }
  | { kind: "install-file"; from: string; to: string; mode?: number }
  | { kind: "write-file"; path: string; content: string; mode?: number }
  | { kind: "remove"; path: string; recursive?: boolean; force?: boolean }
  | { kind: "symlink"; from: string; to: string; force?: boolean }
  | { kind: "chmod"; path: string; mode: string; recursive?: boolean };

export type c420uiRustFsOpsResult = {
  ok: boolean;
  command: "fs-ops";
  version: string;
  results: Array<{
    kind: c420uiRustFsOperation["kind"];
    path: string;
    status: "done" | "missing" | "planned";
  }>;
};

export async function runC420UIRustFsOps(options: {
  rootDir: string;
  operations: c420uiRustFsOperation[];
  dryRun?: boolean;
  allowSudo?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<c420uiRustFsOpsResult> {
  return runC420UIRustHost<c420uiRustFsOpsResult>({
    rootDir: options.rootDir,
    command: "fs-ops",
    input: {
      rootDir: options.rootDir,
      operations: options.operations,
      dryRun: options.dryRun ?? false,
      allowSudo: options.allowSudo ?? false,
    },
    env: options.env,
  });
}

export async function runC420UIRustEnsureLinuxUnpacked(options: {
  rootDir: string;
  distDir: string;
  canonicalName?: string;
  candidateContains?: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  ok: boolean;
  command: "ensure-linux-unpacked";
  version: string;
  selected: string;
  canonical: string;
  createdSymlink: boolean;
  dryRun: boolean;
}> {
  return runC420UIRustHost({
    rootDir: options.rootDir,
    command: "ensure-linux-unpacked",
    input: {
      distDir: options.distDir,
      canonicalName: options.canonicalName ?? "linux-unpacked",
      candidateContains: options.candidateContains ?? "unpacked",
      dryRun: options.dryRun ?? false,
    },
    env: options.env,
  });
}
