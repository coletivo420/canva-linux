#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BUILDER_INTERNAL_NAME = "c420ui-builder";
export const BUILDER_ALIAS = "canva-linux-c420ui-builder";
export const BUILDER_TITLE = "Canva Linux Builder powered by c420ui";

const BUILDER_GLOBAL_FLAGS = new Set(["-y", "--yes", "--dry-run"]);

const RUNTIME_ONLY_VALUED_OPTIONS = [
  "--canva-debug",
  "--credential-store",
  "--gpu-backend",
];

const RUNTIME_ONLY_BOOLEAN_OPTIONS = [
  "--force-x11",
  "--force-wayland",
  "--disable-wayland-color-manager",
];

type NormalizedBuilderArgs = {
  help: boolean;
  bridgeArgs: string[];
  hasBridgeAction: boolean;
};

const ROOT_LAUNCH_GUARD_MESSAGE = `Do not run ${BUILDER_TITLE} with sudo or as root.

Run this builder as your regular user. When an operation needs administrator privileges, Canva Linux asks for authentication only for that specific action.

Running the whole builder as root may break file ownership, user sessions, build artifacts and desktop integration.`;

function findProjectRoot(startDir = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd()): string {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate Canva Linux project root.");
    current = parent;
  }
}

function builderHelp(): string {
  return `${BUILDER_TITLE}

Usage:
  ${BUILDER_ALIAS}
  ${BUILDER_ALIAS} [direct action] [--yes] [--dry-run]

This builder opens the c420ui install and development workspace by default.
It builds, installs, validates, packages, repairs and maintains Canva Linux.

The compiled Canva Linux runtime app is separate:
  canva-linux --help

Builder options:
  -y, --yes
  --force                       Alias for --yes
  -h, --help
  --dry-run

Direct actions:
  Any action flag starting with -- is delegated to the c420ui CLI bridge.
  The c420ui Action Registry decides whether an action is concrete, planned, or invalid.

Runtime options belong to the compiled Canva Linux app:
  canva-linux --help`;
}

function sessionLogPath(): string {
  if (process.env.CANVA_TOOL_SESSION_LOG) return process.env.CANVA_TOOL_SESSION_LOG;
  const stateHome = process.env.XDG_STATE_HOME || path.join(process.env.HOME || "/tmp", ".local", "state");
  return path.join(stateHome, "canva-linux", "tool-session.log");
}

function createSession(rootDir: string): { sessionLog?: string; sessionId: string; env: NodeJS.ProcessEnv } {
  const sessionId = process.env.CANVA_TOOL_SESSION_ID || `builder-${process.pid}-${Date.now()}`;
  let sessionLog: string | undefined = sessionLogPath();
  try {
    fs.mkdirSync(path.dirname(sessionLog), { recursive: true });
    fs.writeFileSync(sessionLog, "");
    fs.appendFileSync(sessionLog, `[session] started id=${sessionId}\n`);
    fs.appendFileSync(sessionLog, `[builder] ${BUILDER_TITLE}\n`);
  } catch {
    sessionLog = undefined;
  }

  return {
    sessionLog,
    sessionId,
    env: {
      ...process.env,
      CANVA_SCRIPT_REPO_ROOT: rootDir,
      CANVA_TOOL_SESSION_ID: sessionId,
      ...(sessionLog ? { CANVA_TOOL_SESSION_LOG: sessionLog } : {}),
    },
  };
}

function selectEntrypoint(rootDir: string, kind: "ui" | "cli"): string {
  const candidates = kind === "ui"
    ? [
        path.join(rootDir, "bootstrap/c420ui/run-c420ui.cjs"),
        path.join(rootDir, ".build/scripts/run-c420ui.js"),
      ]
    : [
        path.join(rootDir, "bootstrap/c420ui/run-c420ui-cli.cjs"),
        path.join(rootDir, ".build/scripts/run-c420ui-cli.js"),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) return candidate;
  }

  throw new Error(
    kind === "ui"
      ? "c420ui bootstrap bundle is missing. Run npm run build:c420ui-bootstrap, then retry."
      : "c420ui CLI bootstrap bundle is missing. Run npm run build:c420ui-bootstrap, then retry.",
  );
}

function isReservedDebugFlag(arg: string): boolean {
  return arg === "--debug" || arg.startsWith("--debug=");
}

function isRuntimeOnlyFlag(arg: string): boolean {
  return (
    RUNTIME_ONLY_BOOLEAN_OPTIONS.includes(arg) ||
    RUNTIME_ONLY_VALUED_OPTIONS.some(
      (option) => arg === option || arg.startsWith(`${option}=`),
    )
  );
}

export function normalizeBuilderArgs(argv: string[]): NormalizedBuilderArgs {
  const bridgeArgs: string[] = [];
  let help = false;
  let hasBridgeAction = false;

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }

    if (isReservedDebugFlag(arg)) {
      throw new Error("--debug is reserved by Electron/Node. Use canva-linux --canva-debug=1 or --canva-debug=2.");
    }

    if (isRuntimeOnlyFlag(arg)) {
      throw new Error(`${arg} is a Canva Linux runtime option. Use canva-linux --help.`);
    }

    if (arg === "--force") {
      bridgeArgs.push("--yes");
      continue;
    }

    if (BUILDER_GLOBAL_FLAGS.has(arg)) {
      bridgeArgs.push(arg);
      continue;
    }

    if (arg.startsWith("--")) {
      hasBridgeAction = true;
      bridgeArgs.push(arg);
      continue;
    }

    throw new Error(`Unsupported builder argument: ${arg}`);
  }

  return { help, bridgeArgs, hasBridgeAction };
}

function assertNonRoot(): void {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error(ROOT_LAUNCH_GUARD_MESSAGE);
  }
}

export function runC420UIBuilder(argv = process.argv.slice(2)): number {
  const parsed = normalizeBuilderArgs(argv);
  if (parsed.help) {
    console.log(builderHelp());
    return 0;
  }

  if (!parsed.hasBridgeAction && parsed.bridgeArgs.length > 0) {
    throw new Error("No direct action was provided.");
  }

  assertNonRoot();
  const rootDir = findProjectRoot(path.resolve(__dirname, ".."));
  const session = createSession(rootDir);
  const kind = parsed.hasBridgeAction ? "cli" : "ui";
  const entrypoint = selectEntrypoint(rootDir, kind);
  const result = spawnSync(process.execPath, [entrypoint, ...parsed.bridgeArgs], {
    cwd: rootDir,
    env: session.env,
    stdio: "inherit",
    shell: false,
  });

  if (session.sessionLog) fs.appendFileSync(session.sessionLog, "[session] ended\n");
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (require.main === module) {
  try {
    process.exit(runC420UIBuilder());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

