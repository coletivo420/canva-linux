#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BUILDER_TITLE = "Canva Linux Builder powered by c420ui";

const DIRECT_ACTION_FLAGS = new Set([
  "--install-native",
  "--install-flatpak",
  "--build-runtime",
  "--build-dir",
  "--validate",
  "--validate-appimage",
  "--validate-appimage-extract",
  "--doctor",
  "--bundle-flatpak",
  "--bundle-appimage",
  "--clean",
  "--uninstall",
  "--uninstall-native",
  "--uninstall-flatpak",
  "--reset-user-data",
  "--purge",
]);

const BUILDER_OPTION_FLAGS = new Set(["-y", "--yes", "--force", "-h", "--help", "--dry-run"]);

const RUNTIME_ONLY_FLAGS = [
  `--${"debug"}=1`,
  `--${"debug"}=2`,
  `--${"credential-store"}`,
  `--${"gpu-backend"}`,
  `--${"force-x11"}`,
  `--${"force-wayland"}`,
] as const;

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
  canva-linux-c420ui-builder
  canva-linux-c420ui-builder [direct action] [--yes] [--dry-run]

This builder opens the c420ui install and development workspace by default.
It builds, installs, validates, packages, repairs and maintains Canva Linux.

The compiled Canva Linux runtime app is separate:
  canva-linux --help

Builder options:
  -y, --yes
  -h, --help
  --dry-run

Builder actions:
  --install-native
  --install-flatpak
  --build-runtime
  --build-dir
  --validate
  --validate-appimage
  --validate-appimage-extract
  --doctor
  --bundle-flatpak
  --bundle-appimage
  --clean
  --uninstall
  --uninstall-native
  --uninstall-flatpak
  --reset-user-data
  --purge`;
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

function isRuntimeOnlyFlag(arg: string): boolean {
  return RUNTIME_ONLY_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`));
}

function normalizeArgs(argv: string[]): { directAction?: string; cliArgs: string[]; help: boolean } {
  const cliArgs: string[] = [];
  let directAction: string | undefined;
  let help = false;

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (isRuntimeOnlyFlag(arg)) {
      throw new Error(`${arg} is a Canva Linux runtime option. Use canva-linux --help.`);
    }
    if (DIRECT_ACTION_FLAGS.has(arg)) {
      if (directAction) throw new Error("Only one direct action can be executed per invocation.");
      directAction = arg;
      cliArgs.push(arg);
      continue;
    }
    if (BUILDER_OPTION_FLAGS.has(arg)) {
      if (arg === "--force") cliArgs.push("--yes");
      else cliArgs.push(arg);
      continue;
    }
    throw new Error(`Unsupported builder argument: ${arg}`);
  }

  return { directAction, cliArgs, help };
}

function assertNonRoot(allowRootDryRun = false): void {
  if (!allowRootDryRun && typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error(ROOT_LAUNCH_GUARD_MESSAGE);
  }
}

export function runCanvaLinuxC420UIBuilder(argv = process.argv.slice(2)): number {
  const parsed = normalizeArgs(argv);
  if (parsed.help) {
    console.log(builderHelp());
    return 0;
  }

  assertNonRoot(Boolean(parsed.directAction && parsed.cliArgs.includes("--dry-run")));
  const rootDir = findProjectRoot(path.resolve(__dirname, ".."));
  const session = createSession(rootDir);
  const kind = parsed.directAction ? "cli" : "ui";
  const entrypoint = selectEntrypoint(rootDir, kind);
  const result = spawnSync(process.execPath, [entrypoint, ...parsed.cliArgs], {
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
    process.exit(runCanvaLinuxC420UIBuilder());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
