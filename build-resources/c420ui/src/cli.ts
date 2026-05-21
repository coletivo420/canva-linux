import { createC420UIActionEngine } from "./action-engine";
import { getC420UIActionCliFlags, type c420uiAction } from "./actions";
import { c420uiExitCodes } from "./exit-codes";
import type { c420uiProjectBridge } from "./bridge";
import type { c420uiRootProvider } from "./root-provider";
import type { C420UIEventSink } from "./events";

export type c420uiCliOptions = {
  bridge: c420uiProjectBridge;
  rootDir: string;
  argv: string[];
  env?: NodeJS.ProcessEnv;
  emit?: C420UIEventSink;
  rootProvider?: c420uiRootProvider;
  writeStdout?: (line: string) => void;
  writeStderr?: (line: string) => void;
};

export type c420uiCliResult = {
  exitCode: number;
  handled: boolean;
};

type ParsedC420UICliArgs = {
  help: boolean;
  dryRun: boolean;
  yes: boolean;
  directActionFlags: string[];
};

function writeLine(writer: ((line: string) => void) | undefined, line: string): void {
  writer?.(line);
}

function renderHelp(bridge: c420uiProjectBridge): string[] {
  const project = bridge.projectInfo();
  const lines = [
    `${project.projectName} c420ui CLI bridge`,
    "",
    "Usage:",
    "  c420ui-cli [direct action] [--yes] [--dry-run]",
    "",
    "Global options:",
    "  -h, --help       Show this help",
    "  -y, --yes        Non-interactive confirmation",
    "      --force      Alias for --yes",
    "      --dry-run    Resolve action metadata without executing commands",
    "",
    "Direct actions:",
  ];

  const actionLines = bridge
    .actions()
    .flatMap((action) => getC420UIActionCliFlags(action))
    .sort()
    .map((flag) => `  ${flag}`);

  return [...lines, ...(actionLines.length ? actionLines : ["  (none)"])];
}

function parseC420UICliArgs(argv: string[]): ParsedC420UICliArgs {
  const parsed: ParsedC420UICliArgs = {
    help: false,
    dryRun: false,
    yes: false,
    directActionFlags: [],
  };

  for (const arg of argv) {
    switch (arg) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--yes":
      case "-y":
      case "--force":
        parsed.yes = true;
        break;
      default:
        parsed.directActionFlags.push(arg);
        break;
    }
  }

  return parsed;
}

export async function runC420UICli(
  options: c420uiCliOptions,
): Promise<c420uiCliResult> {
  const engine = createC420UIActionEngine({
    bridge: options.bridge,
    rootDir: options.rootDir,
    env: options.env,
    emit: options.emit,
    rootProvider: options.rootProvider,
  });
  const parsed = parseC420UICliArgs(options.argv);

  if (parsed.help) {
    for (const line of renderHelp(options.bridge)) {
      writeLine(options.writeStdout, line);
    }
    return { exitCode: c420uiExitCodes.success, handled: true };
  }

  const directActions: c420uiAction[] = [];
  for (const flag of parsed.directActionFlags) {
    const resolution = engine.resolveActionByCliFlag(flag);
    if (!resolution.found) {
      writeLine(options.writeStderr, `Unknown option: ${flag}`);
      return { exitCode: c420uiExitCodes.invalidUsage, handled: true };
    }
    directActions.push(resolution.action);
  }

  if (directActions.length > 1) {
    writeLine(
      options.writeStderr,
      "Only one direct action can be executed per invocation.",
    );
    return { exitCode: c420uiExitCodes.invalidUsage, handled: true };
  }

  const directAction = directActions[0];
  if (!directAction) {
    return { exitCode: c420uiExitCodes.invalidUsage, handled: false };
  }

  const result = await engine.runAction(directAction, {
    dryRun: parsed.dryRun,
    yes: parsed.yes,
  });
  if (result.message) {
    const writer =
      result.status === "failed" ? options.writeStderr : options.writeStdout;
    writeLine(writer, result.message);
  }

  return { exitCode: result.code, handled: true };
}
