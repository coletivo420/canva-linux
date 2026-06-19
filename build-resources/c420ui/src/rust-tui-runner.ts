import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { Readable, Writable } from "node:stream";

import {
  createC420UIActionEngine,
  type c420uiRootAccessRequest,
  type c420uiRootAccessRequestResult,
} from "./action-engine.js";
import { c420uiExitCodes } from "./exit-codes.js";
import type { C420UIEvent } from "./events.js";
import {
  createC420UITuiRenderInput,
  type C420UITuiRenderInput,
} from "./rust-tui-contracts.js";
import {
  runC420UIStartupTasks,
  type c420uiStartupTask,
} from "./startup-task.js";
import type { C420UIAppOptions } from "./terminal/app.js";
import { formatDetectionPanelSummaries } from "./terminal/detected-installations-summary.js";
import { c420uiTheme } from "./terminal/theme.js";
import type { c420uiRootProvider } from "./root-provider.js";

type C420UITuiChildProcess = {
  stdin: Writable;
  stdout: Readable;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "close", listener: (code: number | null) => void): unknown;
};

type C420UITuiSpawn = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: ["pipe", "pipe", "inherit"];
  },
) => C420UITuiChildProcess;

type C420UITuiRuntimeInput =
  | { event: "init"; state: C420UITuiRenderInput }
  | { event: "state"; state: C420UITuiRenderInput }
  | { event: "log"; source: string; line: string; level?: string }
  | { event: "progress"; state: string; label?: string; percent?: number }
  | { event: "action-start"; actionId: string }
  | { event: "action-finish"; actionId: string; status: string; code: number }
  | {
      event: "root-request";
      requestId: string;
      actionId: string;
      reason: string;
    }
  | { event: "error"; message: string };

type C420UITuiRuntimeOutput =
  | { event: "ready" }
  | { event: "action-selected"; actionId: string }
  | { event: "view-changed"; view: C420UITuiRenderInput["view"] }
  | { event: "quit" }
  | { event: "cancel" }
  | {
      event: "root-request-response";
      requestId: string;
      accepted: boolean;
      input?: string;
    };

export type C420UIRustTuiRunnerOptions = C420UIAppOptions & {
  env?: NodeJS.ProcessEnv;
  writeError?: (message: string) => void;
  exit?: (code: number) => never;
  resolveBinary?: (options: {
    rootDir: string;
    env?: NodeJS.ProcessEnv;
  }) => string;
  spawnProcess?: C420UITuiSpawn;
};

export function runC420UIRustTuiApp(
  options: C420UIRustTuiRunnerOptions,
): void {
  const writeError = options.writeError ?? console.error;
  const exit = options.exit ?? (process.exit as (code: number) => never);
  const abortController = new AbortController();
  const pendingRootRequests = new Map<
    string,
    (response: { accepted: boolean; input?: string }) => void
  >();

  let child: C420UITuiChildProcess;

  try {
    const binary = (options.resolveBinary ?? resolveC420UITuiBinary)({
      rootDir: options.config.rootDir,
      env: options.env,
    });
    const spawnProcess = options.spawnProcess ?? (spawn as C420UITuiSpawn);
    child = spawnProcess(binary, ["run", "--json-lines"], {
      cwd: options.config.rootDir,
      env: createC420UITuiProcessEnv(options.env ?? process.env),
      stdio: ["pipe", "pipe", "inherit"],
    });
  } catch (error) {
    writeError(formatRustTuiError(error));
    exit(c420uiExitCodes.generalError);
    return;
  }

  const send = (event: C420UITuiRuntimeInput): void => {
    child.stdin.write(`${JSON.stringify(event)}\n`);
  };

  const actions = options.bridge.actions();
  const theme = {
    supportsTrueColor: c420uiTheme.supportsTrueColor,
    colors: c420uiTheme.colors,
  };
  const renderState = async (
    view: C420UITuiRenderInput["view"] = "main",
  ): Promise<C420UITuiRenderInput> =>
    createC420UITuiRenderInput({
      config: options.config,
      actions: options.bridge.actions(),
      theme,
      view,
      panels: await createLegacyPanels(options),
    });

  send({ event: "init", state: createInitialRenderState(options, actions, theme) });
  void renderState("main").then((state) => send({ event: "state", state }));

  const engine = createC420UIActionEngine({
    bridge: options.bridge,
    rootDir: options.config.rootDir,
    env: options.env,
    rootProvider: options.rootProvider,
    requestRootAccess: (request) =>
      requestRootAccessThroughTui(
        request,
        send,
        pendingRootRequests,
        options.rootProvider,
      ),
    emit(event) {
      forwardActionEngineEvent(event, send);
    },
  });

  child.on("error", (error) => {
    writeError(formatRustTuiError(error));
    exit(c420uiExitCodes.generalError);
  });

  child.on("close", (code) => {
    if (code && code !== 0) {
      writeError(`c420ui-tui exited with code ${code}`);
      exit(code);
    }
  });

  readJsonLines(child.stdout, (event) => {
    void handleTuiEvent({
      event,
      engine,
      send,
      config: options.config,
      bridge: options.bridge,
      renderState,
      startupTasks: options.startupTasks ?? [],
      pendingRootRequests,
      abortController,
      writeError,
      exit,
    });
  }, (error) => {
    writeError(error);
    exit(c420uiExitCodes.generalError);
  });
}

function resolveC420UITuiBinary(options: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
}): string {
  const configured = options.env?.C420UI_TUI_BIN?.trim();
  if (configured) {
    if (!fs.existsSync(configured)) {
      throw new Error(`Configured c420ui-tui binary does not exist: ${configured}`);
    }
    return configured;
  }

  const extension = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    path.join(
      options.rootDir,
      "build-resources",
      "c420ui-rs",
      "target",
      "debug",
      `c420ui-tui${extension}`,
    ),
    path.join(
      options.rootDir,
      "build-resources",
      "c420ui-rs",
      "target",
      "release",
      `c420ui-tui${extension}`,
    ),
  ];

  const binary = candidates.find((candidate) => fs.existsSync(candidate));
  if (!binary) {
    throw new Error("Missing c420ui-tui binary. Run npm run build:c420ui-tui.");
  }
  return binary;
}

function createC420UITuiProcessEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "TERM", "COLORTERM", "LANG", "LC_ALL", "C420UI_TUI_BIN"]) {
    const value = env[key];
    if (value) output[key] = value;
  }
  return output;
}

async function handleTuiEvent(options: {
  event: C420UITuiRuntimeOutput;
  engine: ReturnType<typeof createC420UIActionEngine>;
  send: (event: C420UITuiRuntimeInput) => void;
  config: C420UIAppOptions["config"];
  bridge: C420UIAppOptions["bridge"];
  renderState: (view: C420UITuiRenderInput["view"]) => Promise<C420UITuiRenderInput>;
  startupTasks: c420uiStartupTask[];
  pendingRootRequests: Map<
    string,
    (response: { accepted: boolean; input?: string }) => void
  >;
  abortController: AbortController;
  writeError: (message: string) => void;
  exit: (code: number) => never;
}): Promise<void> {
  const {
    event,
    engine,
    send,
    config,
    bridge,
    renderState,
    startupTasks,
    pendingRootRequests,
    abortController,
    writeError,
    exit,
  } = options;

  if (event.event === "ready") {
    if (startupTasks.length > 0) {
      await runC420UIStartupTasks(startupTasks, (text) => {
        for (const line of splitLogLines(text)) {
          send({ event: "log", source: "system", line });
        }
      });
    }
    return;
  }

  if (event.event === "action-selected") {
    const result = await engine.runActionById(event.actionId, {
      yes: true,
      signal: abortController.signal,
    });
    if (result.message) {
      if (result.status === "success") {
        send({ event: "log", source: "action", line: result.message });
      } else {
        send({ event: "error", message: result.message });
      }
    }
    return;
  }

  if (event.event === "view-changed") {
    send({
      event: "state",
      state: await renderState(event.view),
    });
    return;
  }

  if (event.event === "root-request-response") {
    const resolve = pendingRootRequests.get(event.requestId);
    if (resolve) {
      pendingRootRequests.delete(event.requestId);
      resolve({ accepted: event.accepted, input: event.input });
    }
    return;
  }

  if (event.event === "cancel") {
    abortController.abort();
    exit(c420uiExitCodes.canceled);
    return;
  }

  if (event.event === "quit") {
    exit(c420uiExitCodes.success);
    return;
  }

  writeError(`Unknown c420ui-tui event: ${JSON.stringify(event)}`);
}

function createInitialRenderState(
  options: C420UIRustTuiRunnerOptions,
  actions: ReturnType<C420UIAppOptions["bridge"]["actions"]>,
  theme: C420UITuiRenderInput["theme"],
): C420UITuiRenderInput {
  return createC420UITuiRenderInput({
    config: options.config,
    actions,
    theme,
    view: "main",
    panels: createLoadingPanels(),
  });
}

function createLoadingPanels(): C420UITuiRenderInput["panels"] {
  const loading = "loading...";
  return {
    detectedInstallations: {
      label: "Detected Installations",
      lines: [
        `  Native System: ${loading}`,
        `  Native User: ${loading}`,
        `  Flatpak System: ${loading}`,
        `  Flatpak User: ${loading}`,
      ],
    },
    generatedArtifacts: {
      label: "Generated Artifacts",
      lines: [`  AppImage: ${loading}`],
    },
    linuxArtifacts: {
      label: "Linux Artifacts",
      lines: ["Electron/Node/npm loading..."],
    },
    content: {
      label: "Overview",
      lines: [],
    },
    logs: {
      label: "Logs",
      lines: [],
    },
  };
}

async function createLegacyPanels(
  options: C420UIRustTuiRunnerOptions,
): Promise<Partial<C420UITuiRenderInput["panels"]>> {
  const status = options.bridge.overviewStatus
    ? await options.bridge.overviewStatus()
    : null;
  const panels = formatDetectionPanelSummaries(status, c420uiTheme.colors);
  return {
    detectedInstallations: {
      label: "Detected Installations",
      lines: panels.detectedInstallations.map(stripBlessedTags),
    },
    generatedArtifacts: {
      label: "Generated Artifacts",
      lines: panels.generatedArtifacts.map(stripBlessedTags),
    },
    linuxArtifacts: {
      label: "Linux Artifacts",
      lines: panels.linuxArtifacts.map(stripBlessedTags),
    },
  };
}

function stripBlessedTags(line: string): string {
  return line.replace(/\{\/?[^}]+\}/g, "");
}

async function requestRootAccessThroughTui(
  request: c420uiRootAccessRequest,
  send: (event: C420UITuiRuntimeInput) => void,
  pendingRootRequests: Map<
    string,
    (response: { accepted: boolean; input?: string }) => void
  >,
  rootProvider: c420uiRootProvider | undefined,
): Promise<c420uiRootAccessRequestResult> {
  const requestId = `root-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  send({
    event: "root-request",
    requestId,
    actionId: request.action.id,
    reason: request.reason,
  });

  const response = await new Promise<{ accepted: boolean; input?: string }>(
    (resolve) => {
      pendingRootRequests.set(requestId, resolve);
    },
  );

  if (!response.accepted) {
    return {
      ok: false,
      code: c420uiExitCodes.canceled,
      message: "Root access was canceled.",
    };
  }

  let submittedInput = response.input ?? "";
  let access: c420uiRootAccessRequestResult | undefined;
  try {
    access = rootProvider?.validateRootAccessWithInput
      ? rootProvider.validateRootAccessWithInput(
          request.rootDir,
          request.actionEnv,
          submittedInput,
        )
      : rootProvider?.validateRootAccess(request.rootDir, request.actionEnv);
  } finally {
    submittedInput = "";
  }
  if (access?.ok === false) {
    return access;
  }

  return { ok: true };
}

function forwardActionEngineEvent(
  event: C420UIEvent,
  send: (event: C420UITuiRuntimeInput) => void,
): void {
  if (event.type === "log") {
    send({
      event: "log",
      source: event.source,
      line: event.line,
      level: event.level,
    });
    return;
  }

  if (event.type === "progress") {
    send({
      event: "progress",
      state: event.state,
      label: event.label,
      percent: event.percent,
    });
    return;
  }

  if (event.type === "action:start" && event.actionId) {
    send({ event: "action-start", actionId: event.actionId });
    return;
  }

  if (event.type === "action:finish" && event.actionId) {
    const data = event.data ?? {};
    const code = typeof data.exitCode === "number" ? data.exitCode : 0;
    const status = typeof data.status === "string" ? data.status : "success";
    send({
      event: "action-finish",
      actionId: event.actionId,
      status,
      code,
    });
    return;
  }

  if (event.message) {
    send({ event: "log", source: "system", line: event.message });
  }
}

function readJsonLines(
  stream: Readable,
  onEvent: (event: C420UITuiRuntimeOutput) => void,
  onError: (message: string) => void,
): void {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  stream.on("data", (chunk: Buffer | string) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as C420UITuiRuntimeOutput);
        } catch (error) {
          onError(`Invalid c420ui-tui JSONL event: ${formatRustTuiError(error)}`);
          stream.destroy();
          return;
        }
      }
      newlineIndex = buffer.indexOf("\n");
    }
  });
}

function splitLogLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatRustTuiError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
