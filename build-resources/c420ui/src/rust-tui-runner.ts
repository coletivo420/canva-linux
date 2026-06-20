import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { Readable, Writable } from "node:stream";

import {
  createC420UIRustActionEngine,
  type c420uiRootAccessRequest,
  type c420uiRootAccessRequestResult,
} from "./rust-action-engine.js";
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
import { copyTextToClipboard } from "./terminal/clipboard.js";
import type { C420UIAppOptions } from "./terminal/app-options.js";
import { formatDetectionPanelSummaries } from "./terminal/detected-installations-summary.js";
import {
  loadToolSettings,
  saveToolSettings,
  type ToolSettings,
} from "./terminal/settings.js";
import { c420uiTheme } from "./terminal/theme.js";
import type { c420uiRootProvider } from "./root-provider.js";

const MAX_LOG_HISTORY_LINES = 5000;
const ROOT_PROMPT_MAX_ATTEMPTS = 3;
const ROOT_PROMPT_TIMEOUT_MS = 30_000;

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

type C420UIClipboardCopy = (
  text: string,
) => Promise<{ ok: boolean; message: string }> | { ok: boolean; message: string };

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
  | {
      event: "root-request-result";
      requestId: string;
      ok: boolean;
      message?: string;
    }
  | { event: "error"; message: string };

type C420UITuiRuntimeOutput =
  | { event: "ready" }
  | { event: "action-selected"; actionId: string }
  | {
      event: "view-changed";
      view: C420UITuiRenderInput["view"];
      selected?: number;
    }
  | { event: "copy-logs" }
  | { event: "help" }
  | { event: "toggle" }
  | { event: "setting-toggle"; setting: string }
  | { event: "interrupt-action"; actionId: string }
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
  copyTextToClipboard?: C420UIClipboardCopy;
};

export function runC420UIRustTuiApp(
  options: C420UIRustTuiRunnerOptions,
): void {
  const writeError = options.writeError ?? console.error;
  const exit = options.exit ?? (process.exit as (code: number) => never);
  const toolSettings = loadToolSettings(options.config.project.stateDirectoryName);
  const logHistory: C420UITuiRenderInput["logs"] = [];
  const sessionLog = openSessionLog(resolveSessionLogPath(options), writeError, options.env);
  const sessionLogPath = sessionLog.path;
  const sessionStream = sessionLog.stream;
  let currentView: C420UITuiRenderInput["view"] = "main";
  let activeAction:
    | { actionId: string; abortController: AbortController }
    | undefined;
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
    try {
      child.stdin.write(`${JSON.stringify(event)}\n`);
    } catch (error) {
      writeError(`Failed to write to c420ui-tui: ${formatRustTuiError(error)}`);
    }
  };
  const sendLog = (source: string, line: string, level?: string): void => {
    appendLogLine({ source, line, level }, { logHistory, send, sessionStream, toolSettings });
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
      menu: view === "settings" ? createSettingsMenu(toolSettings) : undefined,
      panels: await createLegacyPanels(options, logHistory, toolSettings),
      footer: createFooter(toolSettings),
    });

  writeSession(sessionStream, "[mode] c420ui");
  send({ event: "init", state: createInitialRenderState(options, actions, theme, toolSettings) });
  void renderState("main").then((state) => send({ event: "state", state }));

  const engine = createC420UIRustActionEngine({
    bridge: options.bridge,
    rootDir: options.config.rootDir,
    projectConfigRoot: options.config.projectConfigRoot,
    env: options.env,
    rootProvider: options.rootProvider,
    requestRootAccess: (request) =>
      requestRootAccessThroughTui(
        request,
        send,
        sendLog,
        pendingRootRequests,
        options.rootProvider,
      ),
    emit(event) {
      forwardActionEngineEvent(event, send, sendLog);
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
      toolSettings,
      logHistory,
      sessionStream,
      sessionLogPath,
      sendLog,
      getCurrentView: () => currentView,
      setCurrentView: (view) => {
        currentView = view;
      },
      getActiveAction: () => activeAction,
      setActiveAction: (action) => {
        activeAction = action;
      },
      copyTextToClipboard: options.copyTextToClipboard ?? copyTextToClipboard,
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
  engine: ReturnType<typeof createC420UIRustActionEngine>;
  send: (event: C420UITuiRuntimeInput) => void;
  config: C420UIAppOptions["config"];
  bridge: C420UIAppOptions["bridge"];
  renderState: (view: C420UITuiRenderInput["view"]) => Promise<C420UITuiRenderInput>;
  startupTasks: c420uiStartupTask[];
  pendingRootRequests: Map<
    string,
    (response: { accepted: boolean; input?: string }) => void
  >;
  toolSettings: ToolSettings;
  logHistory: C420UITuiRenderInput["logs"];
  sessionStream: fs.WriteStream | undefined;
  sessionLogPath: string;
  sendLog: (source: string, line: string, level?: string) => void;
  getCurrentView: () => C420UITuiRenderInput["view"];
  setCurrentView: (view: C420UITuiRenderInput["view"]) => void;
  getActiveAction: () => { actionId: string; abortController: AbortController } | undefined;
  setActiveAction: (
    action: { actionId: string; abortController: AbortController } | undefined,
  ) => void;
  copyTextToClipboard: C420UIClipboardCopy;
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
    toolSettings,
    logHistory,
    sessionStream,
    sessionLogPath,
    sendLog,
    getCurrentView,
    setCurrentView,
    getActiveAction,
    setActiveAction,
    copyTextToClipboard,
    writeError,
    exit,
  } = options;

  if (event.event === "ready") {
    if (startupTasks.length > 0) {
      await runC420UIStartupTasks(startupTasks, (text) => {
        for (const line of splitLogLines(text)) {
          sendLog("system", line);
        }
      });
    }
    return;
  }

  if (event.event === "action-selected") {
    if (getActiveAction()) {
      sendLog(
        "system",
        "An action is already running. Confirm interruption before starting another action.",
        "warning",
      );
      return;
    }
    const action = bridge.actions().find((candidate) => candidate.id === event.actionId);
    sendLog("action", `${event.actionId}${action ? ` ${action.label}` : ""}`);
    const actionAbortController = new AbortController();
    setActiveAction({ actionId: event.actionId, abortController: actionAbortController });
    try {
      const result = await engine.runActionById(event.actionId, {
        yes: true,
        signal: actionAbortController.signal,
      });
      if (result.message) {
        if (result.status === "success") {
          sendLog("action", result.message);
        } else {
          send({ event: "error", message: result.message });
          writeSession(sessionStream, `[error] ${result.message}`);
        }
      }
    } catch (error) {
      const message = formatRustTuiError(error);
      send({ event: "error", message });
      writeSession(sessionStream, `[error] ${message}`);
    } finally {
      if (getActiveAction()?.actionId === event.actionId) {
        setActiveAction(undefined);
      }
      send({ event: "state", state: await renderState(getCurrentView()) });
    }
    return;
  }

  if (event.event === "view-changed") {
    setCurrentView(event.view);
    send({
      event: "state",
      state: await renderState(event.view),
    });
    return;
  }

  if (event.event === "copy-logs") {
    const result = await copyTextToClipboard(collectLogCopyText(logHistory, sessionLogPath));
    sendLog("system", result.message, result.ok ? "info" : "warning");
    return;
  }

  if (event.event === "setting-toggle") {
    const setting = event.setting;
    if (setting === "generalLogsEnabled" || setting === "terminalTextSelectionMode") {
      toolSettings.tool[setting] = !toolSettings.tool[setting];
      saveToolSettings(toolSettings, config.project.stateDirectoryName);
      sendLog("system", `${setting} ${toolSettings.tool[setting] ? "enabled" : "disabled"}`);
      send({ event: "state", state: await renderState("settings") });
    }
    return;
  }

  if (event.event === "help" || event.event === "toggle") {
    return;
  }

  if (event.event === "interrupt-action") {
    const active = getActiveAction();
    if (active?.actionId === event.actionId) {
      active.abortController.abort();
      sendLog("system", `Interrupt requested for ${event.actionId}.`, "warning");
      send({
        event: "progress",
        state: "interrupted",
        label: `Interrupted ${event.actionId}`,
        percent: 0,
      });
      send({
        event: "action-finish",
        actionId: event.actionId,
        status: "canceled",
        code: c420uiExitCodes.canceled,
      });
      setActiveAction(undefined);
      send({ event: "state", state: await renderState(getCurrentView()) });
    }
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
    const active = getActiveAction();
    if (active) {
      active.abortController.abort();
      setActiveAction(undefined);
    }
    writeSession(sessionStream, "[session] ended");
    sessionStream?.end();
    exit(c420uiExitCodes.canceled);
    return;
  }

  if (event.event === "quit") {
    writeSession(sessionStream, "[session] ended");
    sessionStream?.end();
    exit(c420uiExitCodes.success);
    return;
  }

  writeError(`Unknown c420ui-tui event: ${JSON.stringify(event)}`);
}

function createInitialRenderState(
  options: C420UIRustTuiRunnerOptions,
  actions: ReturnType<C420UIAppOptions["bridge"]["actions"]>,
  theme: C420UITuiRenderInput["theme"],
  toolSettings: ToolSettings,
): C420UITuiRenderInput {
  return createC420UITuiRenderInput({
    config: options.config,
    actions,
    theme,
    view: "main",
    panels: createLoadingPanels(),
    footer: createFooter(toolSettings),
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
  logHistory: C420UITuiRenderInput["logs"],
  toolSettings: ToolSettings,
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
    logs: {
      label: toolSettings.tool.terminalTextSelectionMode
        ? "Logs - Text selection mode enabled"
        : "Logs",
      lines: visibleLogHistory(logHistory, toolSettings),
    },
  };
}

function stripBlessedTags(line: string): string {
  return line.replace(/\{\/?[^}]+\}/g, "");
}

function createFooter(toolSettings: ToolSettings): C420UITuiRenderInput["footer"] {
  const items = [
    "Tab Focus",
    "Enter Select",
    "Space Toggle",
    "F5 Copy Logs",
    "? Help",
    "q Quit",
  ];
  return {
    textSelectionMode: toolSettings.tool.terminalTextSelectionMode,
    items: toolSettings.tool.terminalTextSelectionMode
      ? ["Text selection mode enabled", ...items]
      : items,
  };
}

function createSettingsMenu(toolSettings: ToolSettings): C420UITuiRenderInput["menu"] {
  return {
    label: "Application Settings",
    selected: 0,
    items: [
      {
        id: "settings-general",
        label: `${toolSettings.tool.generalLogsEnabled ? "[x]" : "[ ]"} General logs`,
      },
      {
        id: "settings-text-selection",
        label: `${toolSettings.tool.terminalTextSelectionMode ? "[x]" : "[ ]"} Text selection mode`,
      },
      { id: "back-main", label: "Back to Main", view: "main" },
    ],
  };
}

async function requestRootAccessThroughTui(
  request: c420uiRootAccessRequest,
  send: (event: C420UITuiRuntimeInput) => void,
  sendLog: (source: string, line: string, level?: string) => void,
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

  for (let attempt = 1; attempt <= ROOT_PROMPT_MAX_ATTEMPTS; attempt += 1) {
    const response = await waitForRootResponse(requestId, pendingRootRequests);

    if (!response.accepted) {
      sendLog("system", "Root access was canceled.", "warning");
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
      const message = access.message ?? "Root authentication failed.";
      send({
        event: "root-request-result",
        requestId,
        ok: false,
        message,
      });
      sendLog(
        "system",
        `Root authentication failed (${attempt}/${ROOT_PROMPT_MAX_ATTEMPTS}).`,
        "warning",
      );
      if (attempt === ROOT_PROMPT_MAX_ATTEMPTS) return access;
      continue;
    }

    send({ event: "root-request-result", requestId, ok: true });
    sendLog("system", "Root authentication accepted.");
    return { ok: true };
  }

  return {
    ok: false,
    code: c420uiExitCodes.generalError,
    message: "Root authentication failed.",
  };
}

function forwardActionEngineEvent(
  event: C420UIEvent,
  send: (event: C420UITuiRuntimeInput) => void,
  sendLog: (source: string, line: string, level?: string) => void,
): void {
  if (event.type === "log") {
    sendLog(event.source, event.line, event.level);
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
    sendLog("system", event.message, event.level);
  }
}

function waitForRootResponse(
  requestId: string,
  pendingRootRequests: Map<
    string,
    (response: { accepted: boolean; input?: string }) => void
  >,
): Promise<{ accepted: boolean; input?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRootRequests.delete(requestId);
      resolve({ accepted: false });
    }, ROOT_PROMPT_TIMEOUT_MS);
    pendingRootRequests.set(requestId, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

function appendLogLine(
  log: { source: string; line: string; level?: string },
  options: {
    logHistory: C420UITuiRenderInput["logs"];
    send: (event: C420UITuiRuntimeInput) => void;
    sessionStream: fs.WriteStream | undefined;
    toolSettings: ToolSettings;
  },
): void {
  const normalized = {
    source: log.source,
    line: log.line,
    level: log.level,
  };
  options.logHistory.push(normalized);
  if (options.logHistory.length > MAX_LOG_HISTORY_LINES) {
    options.logHistory.splice(0, options.logHistory.length - MAX_LOG_HISTORY_LINES);
  }
  writeSession(options.sessionStream, `[${normalized.source}] ${normalized.line}`);
  if (isVisibleLog(normalized, options.toolSettings)) {
    options.send({ event: "log", ...normalized });
  }
}

function visibleLogHistory(
  logs: C420UITuiRenderInput["logs"],
  toolSettings: ToolSettings,
): C420UITuiRenderInput["logs"] {
  return logs.filter((line) => isVisibleLog(line, toolSettings));
}

function collectLogCopyText(
  logs: C420UITuiRenderInput["logs"],
  sessionLogPath: string,
): string {
  const sessionLog = fs.existsSync(sessionLogPath)
    ? fs.readFileSync(sessionLogPath, "utf8").trim()
    : "";
  const runtimeLog = logs.map((log) => `[${log.source}] ${log.line}`).join("\n");
  return [sessionLog, runtimeLog].filter(Boolean).join("\n");
}

function isVisibleLog(
  line: { source: string; line: string; level?: string },
  toolSettings: ToolSettings,
): boolean {
  if (toolSettings.tool.generalLogsEnabled) return true;
  if (line.level === "error" || line.level === "warning") return true;
  return line.source !== "system";
}

function resolveSessionLogPath(options: C420UIRustTuiRunnerOptions): string {
  const configured = options.config.sessionLogPath?.trim();
  if (configured) return configured;
  return path.join("/tmp", "c420ui", "tool-session.log");
}

function openSessionLog(
  sessionLogPath: string,
  writeError: (message: string) => void,
  env: NodeJS.ProcessEnv | undefined,
): { path: string; stream: fs.WriteStream | undefined } {
  try {
    fs.mkdirSync(path.dirname(sessionLogPath), { recursive: true });
    const stream = fs.createWriteStream(sessionLogPath, { flags: "a" });
    stream.on("error", (error) => {
      writeError(`Session log stream failed: ${formatRustTuiError(error)}`);
    });
    return { path: sessionLogPath, stream };
  } catch (error) {
    const fallbackPath = path.join(
      env?.HOME || process.env.HOME || ".",
      ".tmp",
      "c420ui",
      "tool-session.log",
    );
    try {
      fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
      writeError(
        `Session log primary path is unavailable, using fallback ${fallbackPath}: ${formatRustTuiError(error)}`,
      );
      const stream = fs.createWriteStream(fallbackPath, { flags: "a" });
      stream.on("error", (streamError) => {
        writeError(`Session log fallback stream failed: ${formatRustTuiError(streamError)}`);
      });
      return { path: fallbackPath, stream };
    } catch (fallbackError) {
      writeError(`Session log stream is unavailable: ${formatRustTuiError(fallbackError)}`);
      return { path: fallbackPath, stream: undefined };
    }
  }
}

function writeSession(stream: fs.WriteStream | undefined, line: string): void {
  stream?.write(`${line}\n`);
}

function readJsonLines(
  stream: Readable,
  onEvent: (event: C420UITuiRuntimeOutput) => void,
  onError: (message: string) => void,
): void {
  const decoder = new StringDecoder("utf8");
  let buffer = "";

  stream.on("error", (error) => {
    onError(`c420ui-tui output stream failed: ${formatRustTuiError(error)}`);
  });

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
