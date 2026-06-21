import { runC420UIRustHost } from "./rust-host.js";

export type C420UIRustBootstrapOptions = {
  rootDir: string;
  bootstrapOutDir?: string;
  projectConfigRoot?: string;
  buildMetadataPath?: string;
  env?: NodeJS.ProcessEnv;
};

export type C420UIRustBootstrapDiagnostic = {
  level: string;
  code: string;
  message: string;
};

export type C420UIRustBootstrapResponse = {
  ok: boolean;
  command: string;
  manifest?: Record<string, unknown>;
  diagnostics: C420UIRustBootstrapDiagnostic[];
};

function input(options: C420UIRustBootstrapOptions): Record<string, unknown> {
  return {
    rootDir: options.rootDir,
    bootstrapOutDir:
      options.bootstrapOutDir ?? "build-resources/c420ui/bootstrap/generated",
    projectConfigRoot: options.projectConfigRoot ?? "config",
    buildMetadataPath: options.buildMetadataPath ?? "config/build-metadata.json",
  };
}

export function runC420UIRustBootstrap(
  options: C420UIRustBootstrapOptions,
): Promise<C420UIRustBootstrapResponse> {
  return runC420UIRustHost<C420UIRustBootstrapResponse>({
    rootDir: options.rootDir,
    command: "bootstrap",
    input: input(options),
    timeoutMs: 30000,
    env: options.env,
  });
}

export function runC420UIRustBootstrapCheck(
  options: C420UIRustBootstrapOptions,
): Promise<C420UIRustBootstrapResponse> {
  return runC420UIRustHost<C420UIRustBootstrapResponse>({
    rootDir: options.rootDir,
    command: "bootstrap-check",
    input: input(options),
    timeoutMs: 30000,
    env: options.env,
  });
}

export function createC420UIRustBootstrapManifest(
  options: C420UIRustBootstrapOptions,
): Promise<C420UIRustBootstrapResponse> {
  return runC420UIRustHost<C420UIRustBootstrapResponse>({
    rootDir: options.rootDir,
    command: "bootstrap-manifest",
    input: input(options),
    timeoutMs: 30000,
    env: options.env,
  });
}
