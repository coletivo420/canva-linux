import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type DoctorEnvelope = {
  ok: boolean;
  command: string;
  host?: { os?: string; arch?: string };
  checks?: Array<{ id: string; ok: boolean; message: string }>;
  data?: {
    status?: string;
    message?: string;
    dependencies?: Array<{ id: string; command?: string; label?: string }>;
  };
};

const rootDir = process.cwd();

function resolveHostBinary(): string {
  const extension = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    process.env.C420UI_HOST_BIN,
    path.join(rootDir, "build-resources", "c420ui-rs", "target", "debug", `c420ui-host${extension}`),
    path.join(rootDir, "build-resources", "c420ui-rs", "target", "release", `c420ui-host${extension}`),
  ].filter(Boolean) as string[];
  const binary = candidates.find((candidate) => fs.existsSync(candidate));
  if (!binary) {
    throw new Error("Missing c420ui-host binary. Run npm run build:c420ui-rs.");
  }
  return binary;
}

function readHostDependencyInput(): unknown {
  const configPath = path.join(rootDir, "build-resources", "canva-linux", "config", "host-dependencies.json");
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      node?: Record<string, unknown>;
      commands?: unknown[];
    };
    return {
      node: raw.node
        ? {
            ...raw.node,
            version: process.version,
          }
        : undefined,
      commands: raw.commands,
      env: {
        PATH: process.env.PATH || "",
      },
    };
  }
  return {
    node: { required: true, minimumMajor: 22, version: process.version },
    commands: [
      { id: "git", command: "git", required: true },
      { id: "npm", command: "npm", required: true },
    ],
    env: {
      PATH: process.env.PATH || "",
    },
  };
}

function runHostJson(binary: string, command: string, input?: unknown): DoctorEnvelope {
  const result = spawnSync(binary, [command, "--json"], {
    cwd: rootDir,
    input: input === undefined ? undefined : JSON.stringify(input),
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`${command} timed out or was terminated by ${result.signal}`);
  }
  const output = result.stdout.trim();
  if (!output) {
    throw new Error(`${command} produced no JSON output: ${result.stderr.trim()}`);
  }
  const parsed = JSON.parse(output) as DoctorEnvelope;
  printEnvelope(parsed);
  if (result.status !== 0 || parsed.ok === false) {
    process.exitCode = 1;
  }
  return parsed;
}

function printEnvelope(envelope: DoctorEnvelope): void {
  const status = envelope.ok ? "ok" : "error";
  console.log(`[${status}] ${envelope.command}`);
  if (envelope.host) {
    console.log(`[info] host: ${envelope.host.os ?? "unknown"} ${envelope.host.arch ?? "unknown"}`);
  }
  for (const check of envelope.checks ?? []) {
    console.log(`[${check.ok ? "ok" : "error"}] ${check.id}: ${check.message}`);
  }
  if (envelope.data?.message) {
    const level = envelope.ok ? "ok" : envelope.data.status === "missing" ? "warning" : "error";
    console.log(`[${level}] ${envelope.data.message}`);
  }
  for (const dependency of envelope.data?.dependencies ?? []) {
    console.log(`[warning] missing ${dependency.command ?? dependency.id}`);
  }
}

function main(): void {
  const binary = resolveHostBinary();
  console.log("[info] c420ui-host host-info");
  runHostJson(binary, "host-info");
  console.log("[info] c420ui-host doctor");
  runHostJson(binary, "doctor");
  console.log("[info] c420ui-host check-host-dependencies");
  runHostJson(binary, "check-host-dependencies", readHostDependencyInput());
  if (!process.exitCode) {
    console.log("[ok] Doctor / check host tools completed");
  }
}

try {
  main();
} catch (error) {
  console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
