import { runC420UIRustHost } from "./rust-host.js";

export type c420uiRustArtifactFileOpsResult = {
  ok: boolean;
  command: "artifact-file-ops";
  version: string;
  cleaned: Array<{ path: string; status: "removed" | "planned" }>;
  selected?: string | null;
  size?: number | null;
};

export async function runC420UIRustArtifactFileOps(options: {
  rootDir: string;
  distDir: string;
  cleanup?: string[];
  find?: {
    startsWith: string;
    endsWith: string;
    expect: "one";
  };
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): Promise<c420uiRustArtifactFileOpsResult> {
  return runC420UIRustHost<c420uiRustArtifactFileOpsResult>({
    rootDir: options.rootDir,
    command: "artifact-file-ops",
    input: {
      distDir: options.distDir,
      cleanup: options.cleanup ?? [],
      find: options.find,
      dryRun: options.dryRun ?? false,
    },
    env: options.env,
  });
}
