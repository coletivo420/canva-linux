import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type C420UIRustProjectDiagnostic = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export type C420UIRustProjectConfig = {
  ok: boolean;
  command: "project-config";
  project: {
    ui: Record<string, unknown>;
    actions: Array<Record<string, unknown>>;
    hostDependencies: Array<Record<string, unknown>>;
    npmDependencies: Array<unknown>;
    install: Record<string, unknown>;
    maintenance: Record<string, unknown>;
  };
  diagnostics: C420UIRustProjectDiagnostic[];
};

export function loadC420UIRustProjectConfig(options: {
  rootDir: string;
  projectConfigRoot: string;
  env?: NodeJS.ProcessEnv;
}): C420UIRustProjectConfig {
  const binPath = resolveC420UIRustHostBinary(options.rootDir, options.env);
  const child = spawnSync(binPath, ["project-config", "--json"], {
    env: buildRustHostProcessEnv(options.env),
    input: `${JSON.stringify({
      rootDir: options.rootDir,
      projectConfigRoot: options.projectConfigRoot,
    })}\n`,
    encoding: "utf8",
    shell: false,
  });

  if (child.error && child.status === null) throw child.error;
  if (child.status !== 0) {
    const stderr = child.stderr.trim().slice(0, 500);
    throw new Error(`c420ui-host project-config failed with code ${child.status}. ${stderr}`);
  }

  try {
    return JSON.parse(child.stdout.trim()) as C420UIRustProjectConfig;
  } catch {
    throw new Error("Failed to parse c420ui-host project-config output as JSON.");
  }
}

function resolveC420UIRustHostBinary(rootDir: string, env: NodeJS.ProcessEnv = {}): string {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  if (!binPath) {
    const debugPath = path.join(rootDir, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path.join(rootDir, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs.existsSync(debugPath)) binPath = debugPath;
    else if (fs.existsSync(releasePath)) binPath = releasePath;
  }
  if (!binPath || !fs.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}

function buildRustHostProcessEnv(env: NodeJS.ProcessEnv = {}): Record<string, string> {
  const childEnv: Record<string, string> = {};
  if (env.PATH) childEnv.PATH = env.PATH;
  else if (process.env.PATH) childEnv.PATH = process.env.PATH;
  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}
