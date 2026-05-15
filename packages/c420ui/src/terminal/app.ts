const tui = {
  screen: require("blessed/lib/widgets/screen"),
  box: require("blessed/lib/widgets/box"),
  list: require("blessed/lib/widgets/list"),
  log: require("blessed/lib/widgets/log"),
};
import {
  confirmDialog,
  inputDialog,
  messageDialog,
  type InputDialogResult,
} from "./modal";
import { c420uiTheme } from "./theme";
import { copyTextToClipboard } from "./clipboard";
import {
  loadToolSettings,
  saveToolSettings,
  toolSettingsPath,
  type ToolSettings,
} from "./settings";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import {
  createC420UIActionEngine,
  type c420uiRootAccessRequest,
  type c420uiRootAccessRequestResult,
} from "../action-engine";
import type { c420uiAction } from "../actions";
import type { c420uiProjectBridge } from "../bridge";
import type { c420uiOverviewStatus } from "../detection";
import { c420uiExitCodes } from "../exit-codes";
import type { c420uiRootProvider } from "../root-provider";
import type {
  C420UIBrandConfig,
  C420UIConfig,
  C420UIProjectConfig,
} from "../types";
import {
  createInteractiveActionRunner,
  interactiveActionRequiresConfirmation,
} from "./interactive-action-runner";
import {
  runC420UIStartupTasks,
  type c420uiStartupTask,
} from "../startup-task";

// --- Types ---

type View =
  | "main"
  | "install"
  | "development"
  | "maintenance"
  | "settings"
  | "help";

type ProgressState =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "failed"
  | "canceled";

type LogSource = "stdout" | "stderr" | "system";

type InteractiveAction = c420uiAction & {
  command?: string;
  args?: string[];
  confirmationTitle?: string;
  confirmationMessage?: string;
};

export type C420UIAppOptions = {
  config: C420UIConfig;
  bridge: c420uiProjectBridge;
  rootProvider?: c420uiRootProvider;
  startupTasks?: c420uiStartupTask[];
};

type FocusZone = "menu" | "diagnostics" | "content" | "logs";

type HeaderBoxLayout = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type HeaderLayout = {
  c420uiHeader: HeaderBoxLayout;
  projectHeader: HeaderBoxLayout;
  workspaceTop: number;
  layoutMode: "side-by-side" | "stacked";
};

type SettingsItem =
  | {
      kind: "section";
      label: string;
    }
  | {
      kind: "toggle";
      key: keyof ToolSettings["tool"];
      label: string;
    }
  | {
      kind: "note";
      label: string;
    };

// --- Constants ---

const MAX_LOG_HISTORY_LINES = 5000;
const TOOL_LOG_PREFIX = "Tool |";
const ACTION_LOG_PREFIX = "Action |";
const FOCUS_ZONES: FocusZone[] = ["menu", "diagnostics", "content", "logs"];
const HEADER_GAP = 0;
const HEADER_BOX_HORIZONTAL_PADDING = 4;
const c420uiHeaderMinWidth = 28;
const PROJECT_HEADER_MIN_WIDTH = 40;


function isPlannedAction(action: InteractiveAction): boolean {
  return action.kind === "planned" || Boolean(action.planned);
}

function longestLineLength(lines: string[]): number {
  return Math.max(0, ...lines.map((line) => line.length));
}

export function computeHeaderLayout(
  screenWidth: number,
  brandConfig: C420UIBrandConfig,
  projectConfig: C420UIProjectConfig,
): HeaderLayout {
  const c420uiHeaderHeight = brandConfig.logoLines.length + 3;
  const projectHeaderHeight = 5;
  const c420uiHeaderContentWidth = longestLineLength([
    `${brandConfig.name} v${brandConfig.version}`,
    ...brandConfig.logoLines,
  ]);
  const projectHeaderContentWidth = longestLineLength([
    projectConfig.projectName,
    projectConfig.projectSubtitle,
    `Version: ${projectConfig.displayVersion}${projectConfig.status ? ` ${projectConfig.status}` : ""} | Phase: ${projectConfig.phase ?? "unknown"}`,
  ]);
  const c420uiMinWidth = Math.max(
    c420uiHeaderContentWidth + HEADER_BOX_HORIZONTAL_PADDING,
    c420uiHeaderMinWidth,
  );
  const projectMinWidth = Math.max(
    projectHeaderContentWidth + HEADER_BOX_HORIZONTAL_PADDING,
    PROJECT_HEADER_MIN_WIDTH,
  );
  const normalizedScreenWidth = Math.max(1, screenWidth);
  const canUseSideBySide =
    normalizedScreenWidth >= c420uiMinWidth + projectMinWidth;

  if (!canUseSideBySide) {
    return {
      c420uiHeader: {
        top: 0,
        left: 0,
        width: normalizedScreenWidth,
        height: c420uiHeaderHeight,
      },
      projectHeader: {
        top: c420uiHeaderHeight,
        left: 0,
        width: normalizedScreenWidth,
        height: projectHeaderHeight,
      },
      workspaceTop: c420uiHeaderHeight + projectHeaderHeight + HEADER_GAP,
      layoutMode: "stacked",
    };
  }

  const c420uiHeaderWidth = Math.min(c420uiMinWidth, normalizedScreenWidth);
  const projectHeaderWidth = normalizedScreenWidth - c420uiHeaderWidth;

  return {
    c420uiHeader: {
      top: 0,
      left: 0,
      width: c420uiHeaderWidth,
      height: c420uiHeaderHeight,
    },
    projectHeader: {
      top: 0,
      left: c420uiHeaderWidth,
      width: projectHeaderWidth,
      height: projectHeaderHeight,
    },
    workspaceTop:
      Math.max(c420uiHeaderHeight, projectHeaderHeight) + HEADER_GAP,
    layoutMode: "side-by-side",
  };
}

// --- Main Application Entry ---

export function createApp(options: C420UIAppOptions) {
  const opts = options.config;
  const { bridge, rootProvider } = options;
  // --- Initialization & State ---

  let toolSettings = loadToolSettings(opts.project.stateDirectoryName);
  const settingsPath = toolSettingsPath(opts.project.stateDirectoryName);
  let terminalTextSelectionModeActive =
    toolSettings.tool.terminalTextSelectionMode;
  let tuiMouseEnabled = !terminalTextSelectionModeActive;

  function footerContent() {
    return [
      terminalTextSelectionModeActive
        ? "{bold}Text selection mode enabled{/bold}"
        : "",
      "{bold}Tab{/bold} Focus",
      "{bold}Enter{/bold} Select",
      "{bold}Space{/bold} Toggle",
      "{bold}F5{/bold} Copy Logs",
      "{bold}F6{/bold} Plain Logs",
      "{bold}?{/bold} Help",
      "{bold}q{/bold} Quit",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  const screen = tui.screen({
    smartCSR: true,
    title: opts.title,
    fullUnicode: true,
  });

  // --- UI Layout Calculations ---

  let headerLayout = computeHeaderLayout(
    Number(screen.width) || process.stdout.columns || 80,
    opts.brand,
    opts.project,
  );

  // --- UI Widgets ---

  const c420uiHeader = tui.box({
    top: headerLayout.c420uiHeader.top,
    left: headerLayout.c420uiHeader.left,
    width: headerLayout.c420uiHeader.width,
    height: headerLayout.c420uiHeader.height,
    border: "line",
    tags: true,
    content: [
      `{bold}${opts.brand.name} v${opts.brand.version}{/bold}`,
      ...opts.brand.logoLines,
    ].join("\n"),
    style: c420uiTheme.header,
  });

  const projectHeader = tui.box({
    top: headerLayout.projectHeader.top,
    left: headerLayout.projectHeader.left,
    width: headerLayout.projectHeader.width,
    height: headerLayout.projectHeader.height,
    border: "line",
    tags: true,
    content: [
      `{bold}${opts.project.projectName}{/bold}`,
      opts.project.projectSubtitle,
      `Version: ${opts.project.displayVersion}${opts.project.status ? ` ${opts.project.status}` : ""} | Phase: ${opts.project.phase ?? "unknown"}`,
    ].join("\n"),
    style: c420uiTheme.header,
  });

  const menu = tui.list({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    keys: true,
    mouse: tuiMouseEnabled,
    border: "line",
    tags: true,
    label: "Main Menu",
    style: c420uiTheme.menu,
  });

  const diagnostics = tui.box({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    border: "line",
    label: "Detected Installations",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content,
  });

  const content = tui.box({
    top: headerLayout.workspaceTop,
    left: "32%",
    width: "68%",
    height: 1,
    border: "line",
    label: "Overview",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content,
  });

  const logs = tui.log({
    top: headerLayout.workspaceTop,
    left: "32%",
    width: "68%",
    height: 1,
    border: "line",
    label: "Logs",
    keys: true,
    mouse: tuiMouseEnabled,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: c420uiTheme.colors.surfaceAlt,
      },
      style: {
        bg: c420uiTheme.colors.lightBlue,
      },
    },
    scrollback: MAX_LOG_HISTORY_LINES,
    tags: true,
    style: c420uiTheme.logs,
  });

  const footer = tui.box({
    bottom: 0,
    height: 1,
    width: "100%",
    tags: true,
    content: footerContent(),
    style: c420uiTheme.footer,
  });

  const progress = tui.box({
    bottom: 1,
    height: 1,
    left: "32%",
    width: "68%",
    tags: true,
    content: "",
    style: {
      fg: "white",
      bg: "black",
    },
  });

  screen.append(c420uiHeader);
  screen.append(projectHeader);
  screen.append(menu);
  screen.append(diagnostics);
  screen.append(content);
  screen.append(logs);
  screen.append(progress);
  screen.append(footer);

  function applyHeaderBoxLayout(widget: any, boxLayout: HeaderBoxLayout) {
    widget.top = boxLayout.top;
    widget.left = boxLayout.left;
    widget.width = boxLayout.width;
    widget.height = boxLayout.height;
  }

  function applyLayout() {
    const screenWidth = Math.max(
      1,
      Number(screen.width) || process.stdout.columns || 80,
    );
    const screenHeight = Math.max(
      1,
      Number(screen.height) || process.stdout.rows || 24,
    );
    headerLayout = computeHeaderLayout(screenWidth, opts.brand, opts.project);

    applyHeaderBoxLayout(c420uiHeader, headerLayout.c420uiHeader);
    applyHeaderBoxLayout(projectHeader, headerLayout.projectHeader);

    const workspaceTop = headerLayout.workspaceTop;
    const reservedFooterRows = 2;
    const workspaceHeight = Math.max(
      1,
      screenHeight - workspaceTop - reservedFooterRows,
    );
    const leftColumnWidth = Math.min(
      Math.max(18, Math.floor(screenWidth * 0.32)),
      Math.max(1, screenWidth - 1),
    );
    const rightColumnLeft = leftColumnWidth;
    const rightColumnWidth = Math.max(1, screenWidth - rightColumnLeft);
    const menuHeight = Math.max(3, Math.floor(workspaceHeight * 0.68));
    const diagnosticsTop = workspaceTop + menuHeight;
    const diagnosticsHeight = Math.max(
      3,
      screenHeight - diagnosticsTop - reservedFooterRows,
    );
    const contentHeight = Math.max(3, Math.floor(workspaceHeight * 0.36));
    const logsTop = workspaceTop + contentHeight;
    const logsHeight = Math.max(3, screenHeight - logsTop - reservedFooterRows);

    menu.top = workspaceTop;
    menu.left = 0;
    menu.width = leftColumnWidth;
    menu.height = menuHeight;

    diagnostics.top = diagnosticsTop;
    diagnostics.left = 0;
    diagnostics.width = leftColumnWidth;
    diagnostics.height = diagnosticsHeight;

    content.top = workspaceTop;
    content.left = rightColumnLeft;
    content.width = rightColumnWidth;
    content.height = contentHeight;

    logs.top = logsTop;
    logs.left = rightColumnLeft;
    logs.width = rightColumnWidth;
    logs.height = logsHeight;

    progress.left = rightColumnLeft;
    progress.width = rightColumnWidth;
    footer.width = screenWidth;
  }

  applyLayout();

  screen.on("resize", () => {
    applyLayout();
    screen.render();
  });

  function applyProgramMouseMode() {
    const program = screen.program as
      | {
          enableMouse?: () => void;
          disableMouse?: () => void;
        }
      | undefined;
    if (terminalTextSelectionModeActive) {
      program?.disableMouse?.();
      return;
    }
    program?.enableMouse?.();
  }

  function setWidgetMouseEnabled(widget: any, enabled: boolean) {
    widget.options = { ...(widget.options ?? {}), mouse: enabled };
    widget.mouse = enabled;
  }

  function applyGlobalMouseMode() {
    terminalTextSelectionModeActive =
      toolSettings.tool.terminalTextSelectionMode;
    tuiMouseEnabled = !terminalTextSelectionModeActive;
    applyProgramMouseMode();
    for (const widget of [menu, diagnostics, content, logs]) {
      setWidgetMouseEnabled(widget, tuiMouseEnabled);
    }
    footer.setContent(footerContent());
  }

  applyGlobalMouseMode();

  // --- Menu and View Items ---

  const mainItems: Array<{ label: string; view: View }> = [
    { label: "Install", view: "install" },
    { label: "Development", view: "development" },
    { label: "Maintenance & Uninstall", view: "maintenance" },
    { label: "Application Settings", view: "settings" },
    { label: "Help", view: "help" },
  ];

  const settingsItems: SettingsItem[] = [
    {
      kind: "section",
      label: `${opts.project.projectName} Install and Development Tool`,
    },
    {
      kind: "toggle",
      key: "generalLogsEnabled",
      label: `Enable general logs for ${opts.project.projectName} Install and Development Tool`,
    },
    {
      kind: "toggle",
      key: "terminalTextSelectionMode",
      label: "Manual text selection mode",
    },
    {
      kind: "section",
      label: `${opts.project.projectName} final build`,
    },
    {
      kind: "note",
      label: "Final build settings will be added in a later phase",
    },
  ];

  // --- Application Internal State ---

  let currentView: View = "main";
  let focusZone: FocusZone = "menu";
  let menuLabelText = "Main Menu";
  const diagnosticsLabelText = "Detected Installations";
  let contentLabelText = "Overview";
  let logsLabelText = "Logs";
  let currentActions: InteractiveAction[] = [];
  let running = false;
  let modalActive = false;

  async function requestInteractiveRootAccess(
    request: c420uiRootAccessRequest,
  ): Promise<c420uiRootAccessRequestResult> {
    if (!rootProvider?.validateRootAccessWithInput) {
      return {
        ok: false,
        code: c420uiExitCodes.rootPolicyError,
        message: "[error] Interactive root authentication is unavailable.",
      };
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let result: InputDialogResult;

      modalActive = true;
      try {
        result = await inputDialog(
          screen,
          "Administrator authorization",
          [
            `${request.action.label}`,
            "",
            "Enter your sudo password to continue.",
            `Reason: ${request.reason}`,
          ].join("\n"),
          30000,
        );
      } catch {
        return {
          ok: false,
          code: c420uiExitCodes.generalError,
          message: "[error] Administrator authorization prompt failed.",
        };
      } finally {
        modalActive = false;
      }

      if (result.status === "canceled") {
        return {
          ok: false,
          code: c420uiExitCodes.canceled,
          message: "[info] Administrator authorization canceled.",
        };
      }

      if (result.status === "timeout") {
        return {
          ok: false,
          code: c420uiExitCodes.canceled,
          message: "[error] Administrator authorization timed out.",
        };
      }

      let validation: c420uiRootAccessRequestResult;
      let submittedInput = result.value;
      try {
        validation = rootProvider.validateRootAccessWithInput(
          opts.rootDir,
          request.actionEnv,
          submittedInput,
        );
      } catch {
        return {
          ok: false,
          code: c420uiExitCodes.rootPolicyError,
          message: "[error] Administrator authorization validation failed.",
        };
      } finally {
        submittedInput = "";
      }

      if (validation.ok) {
        const env = rootProvider.buildRootActionEnvironment
          ? rootProvider.buildRootActionEnvironment(
              request.action,
              request.actionEnv,
            )
          : request.actionEnv;

        return { ok: true, env };
      }

      appendLogText(
        `[warn] Administrator authorization failed (${attempt}/${maxAttempts}).\n`,
        "system",
      );

      if (attempt === maxAttempts) {
        return validation;
      }
    }

    return {
      ok: false,
      code: c420uiExitCodes.rootPolicyError,
      message: "[error] Administrator authorization failed.",
    };
  }

  const actionRunner = createInteractiveActionRunner({
    bridge,
    rootDir: opts.rootDir,
    env: process.env,
    rootProvider,
    requestRootAccess: rootProvider ? requestInteractiveRootAccess : undefined,
    createActionEngine: createC420UIActionEngine,
    appendLogText(text, source) {
      appendLogText(
        text,
        source === "stdout" || source === "stderr" ? source : "system",
      );
    },
    setProgress(state, percent, label) {
      if (state === "running") {
        setProgressRunning(percent ?? 5, label);
      } else if (state === "success") {
        setProgressSuccess(label);
      } else if (state === "warning") {
        setProgressWarning(label);
      } else if (state === "canceled") {
        setProgressCanceled();
      } else if (state === "failed") {
        setProgressError(label);
      } else {
        clearProgress();
      }
    },
    setRunning(nextRunning) {
      running = nextRunning;
    },
  });
  let progressState: ProgressState = "idle";
  let lastCtrlCAt = 0;
  let updatingSettingsMenuItems = false;

  const logBuffers: Record<LogSource, string> = {
    stdout: "",
    stderr: "",
    system: "",
  };

  const logHistory: string[] = [];

  const sessionLogPath =
    opts.sessionLogPath ||
    path.join(
      process.env.XDG_STATE_HOME ||
        path.join(process.env.HOME || ".", ".local/state"),
      opts.project.stateDirectoryName,
      "tool-session.log",
    );

  const launcherSessionId = opts.sessionId?.trim() || "";

  // --- Logging & Session Management ---

  function readExistingSessionLog(logPath: string): string {
    try {
      return fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
    } catch {
      return "";
    }
  }

  let sessionStreamOpenError: string | null = null;
  let sessionLogUnavailableWarningShown = false;

  function warnSessionLogUnavailableOnce() {
    if (sessionLogUnavailableWarningShown) {
      return;
    }

    sessionLogUnavailableWarningShown = true;
    const reason = sessionStreamOpenError ? ` (${sessionStreamOpenError})` : "";
    const warning = `[warn] Session log stream is unavailable: ${sessionLogPath}${reason}`;

    displayLogLine(warning, "system");

    try {
      // Use console.warn only as a fallback. Do not call appendLogText here,
      // because appendLogText calls writeSession and would recurse.
      console.warn(warning);
    } catch {
      // Ignore fallback console failures.
    }
  }

  function recordSessionStreamError(error: unknown) {
    sessionStreamOpenError =
      error instanceof Error ? error.message : String(error);
    warnSessionLogUnavailableOnce();
  }

  function openSessionStream(logPath: string): Writable | null {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      const stream = fs.createWriteStream(logPath, { flags: "a" });
      stream.on("error", (error) => {
        recordSessionStreamError(error);
        // Keep the c420ui alive when the configured state path becomes unavailable.
      });
      return stream;
    } catch (error) {
      recordSessionStreamError(error);
      return null;
    }
  }

  const launcherSessionLog = readExistingSessionLog(sessionLogPath);
  const sessionStream = openSessionStream(sessionLogPath);

  const writeSession = (line: string) => {
    if (!sessionStream || sessionStreamOpenError) {
      warnSessionLogUnavailableOnce();
      return;
    }

    try {
      sessionStream.write(`${line}\n`);
    } catch (error) {
      recordSessionStreamError(error);
    }
  };

  writeSession("[mode] c420ui");

  process.on("exit", () => {
    writeSession("[session] ended");
  });

  // --- Detection & Diagnostics ---

  let overviewStatus: c420uiOverviewStatus | null = null;
  let overviewDetectionPromise: Promise<c420uiOverviewStatus | null> | null = null;
  let overviewDetectionError: string | null = null;

  const detectedSummary = (s: c420uiOverviewStatus | null) => {
    if (!s) {
      return [
        `  Native Install: {${c420uiTheme.colors.appImageLoading}-fg}loading...{/${c420uiTheme.colors.appImageLoading}-fg}`,
        `  Flatpak Install: {${c420uiTheme.colors.appImageLoading}-fg}loading...{/${c420uiTheme.colors.appImageLoading}-fg}`,
        `  AppImage artifacts: {${c420uiTheme.colors.appImageLoading}-fg}loading...{/${c420uiTheme.colors.appImageLoading}-fg}`,
      ];
    }
    const i = s.installations;
    const fmt = (detected: boolean, version: string | boolean | undefined) => {
      if (!detected) {
        return `{${c420uiTheme.colors.statusNotDetected}-fg}not detected{/${c420uiTheme.colors.statusNotDetected}-fg}`;
      }
      const v =
        typeof version === "string" && version.trim()
          ? `v${version.trim().replace(/^v/, "")}`
          : "version unknown";
      return `{${c420uiTheme.colors.statusDetected}-fg}detected{/${c420uiTheme.colors.statusDetected}-fg}      ${v}`;
    };
    return [
      `  Native System: ${fmt(Boolean(i.nativeSystem), i.nativeSystemVersion)}`,
      `  Native User: ${fmt(Boolean(i.nativeUser), i.nativeUserVersion)}`,
      `  Flatpak System: ${fmt(Boolean(i.flatpakSystem), i.flatpakSystemVersion)}`,
      `  Flatpak User: ${fmt(Boolean(i.flatpakUser), i.flatpakUserVersion)}`,
      `  AppImage: ${fmt(Boolean(i.appImageArtifacts), i.appImageVersion)}`,
    ];
  };

  function renderDiagnosticsBox() {
    if (overviewDetectionError) {
      diagnostics.setContent(
        `  {${c420uiTheme.colors.error}-fg}Detection error{/${c420uiTheme.colors.error}-fg}\n  ${overviewDetectionError}`,
      );
      return;
    }
    diagnostics.setContent(detectedSummary(overviewStatus).join("\n"));
  }

  function refreshDetectedInstallations(
    reason = "unknown",
  ): Promise<c420uiOverviewStatus | null> {
    if (overviewDetectionPromise) {
      return overviewDetectionPromise;
    }
    appendLogText(`[info] Detection started (${reason}).\n`, "system");
    overviewDetectionPromise = detectInstallationStatusNow()
      .then((latestStatus) => {
        if (latestStatus) {
          overviewStatus = latestStatus;
          overviewDetectionError = null;
        } else {
          overviewDetectionError = "Unable to parse status output";
          appendLogText("[error] Detection status parsing failed.\n", "system");
        }
        appendLogText(`[info] Detection finished (${reason}).\n`, "system");
        renderDiagnosticsBox();
        renderCurrentContentPreservingProgress();
        return overviewStatus;
      })
      .finally(() => {
        overviewDetectionPromise = null;
      });
    return overviewDetectionPromise;
  }

  function getInstallDetectionKey(
    action: c420uiAction,
  ): keyof c420uiOverviewStatus["installations"] | null {
    return action.installDetectionKey ?? null;
  }

  async function detectInstallationStatusNow(): Promise<c420uiOverviewStatus | null> {
    if (!bridge.overviewStatus) {
      return null;
    }

    try {
      return await bridge.overviewStatus();
    } catch (error) {
      appendLogText(
        `[error] Detection status failed: ${error instanceof Error ? error.message : String(error)}\n`,
        "system",
      );
      return null;
    }
  }

  // --- Log Rendering ---

  function isCriticalToolLog(line: string): boolean {
    return (
      /^\[(error|warn)\]/i.test(line) || /authentication failed/i.test(line)
    );
  }

  function shouldDisplayLogLine(line: string, source: LogSource): boolean {
    if (source !== "system") {
      return true;
    }
    return toolSettings.tool.generalLogsEnabled || isCriticalToolLog(line);
  }

  function displayLogLine(line: string, source: LogSource) {
    const prefix = source === "system" ? TOOL_LOG_PREFIX : ACTION_LOG_PREFIX;
    const msg = `${prefix} ${line}`.replace(/[{}]/g, (c) =>
      c === "{" ? "\\{" : "\\}",
    );
    logHistory.push(`${prefix} ${line}`);
    if (logHistory.length > MAX_LOG_HISTORY_LINES) {
      logHistory.shift();
    }
    if (source === "stderr") {
      logs.log(`{red-fg}${msg}{/red-fg}`);
    } else if (source === "system") {
      logs.log(`{cyan-fg}${msg}{/cyan-fg}`);
    } else {
      logs.log(msg);
    }
  }

  function appendLogLine(line: string, source: LogSource) {
    writeSession(`[${source}] ${line}`);
    if (shouldDisplayLogLine(line, source)) {
      displayLogLine(line, source);
    }
  }

  function appendLogText(text: string, source: LogSource = "stdout") {
    logBuffers[source] += text;
    while (true) {
      const m = logBuffers[source].match(/\r?\n/);
      if (!m || m.index === undefined) {
        break;
      }
      const i = m.index;
      const n = m[0].length;
      appendLogLine(logBuffers[source].slice(0, i), source);
      logBuffers[source] = logBuffers[source].slice(i + n);
    }
    screen.render();
  }

  function importLauncherSessionLog() {
    if (
      !toolSettings.tool.generalLogsEnabled ||
      !launcherSessionId ||
      !launcherSessionLog.includes(`[session] started id=${launcherSessionId}`)
    ) {
      return;
    }
    for (const line of launcherSessionLog.split(/\r?\n/)) {
      if (line.trim()) {
        displayLogLine(line, "system");
      }
    }
  }

  // --- Focus & Layout Helpers ---

  function activeLabel(label: string): string {
    return `{${c420uiTheme.colors.activeLabel}-fg}${label}{/${c420uiTheme.colors.activeLabel}-fg}`;
  }

  function inactiveLabel(label: string): string {
    return `{${c420uiTheme.colors.inactiveLabel}-fg}${label}{/${c420uiTheme.colors.inactiveLabel}-fg}`;
  }

  function setWidgetBorder(
    widget: any,
    active: boolean,
  ) {
    widget.style.border = {
      ...(widget.style.border ?? {}),
      fg: active
        ? c420uiTheme.colors.activeBorder
        : c420uiTheme.colors.inactiveBorder,
    };
  }

  function setLabeledPanel(
    widget: any,
    label: string,
    active: boolean,
  ) {
    setWidgetBorder(widget, active);
    widget.setLabel(active ? activeLabel(label) : inactiveLabel(label));
  }

  function setFocusZone(nextZone: FocusZone) {
    if (modalActive || focusZone === nextZone) {
      return;
    }
    focusZone = nextZone;
    if (focusZone === "menu") {
      menu.focus();
    } else if (focusZone === "diagnostics") {
      diagnostics.focus();
    } else if (focusZone === "content") {
      content.focus();
    } else {
      logs.focus();
    }
    applyFocusStyles();
    screen.render();
  }

  function moveFocus(delta: number) {
    const index = FOCUS_ZONES.indexOf(focusZone);
    const nextIndex = (index + delta + FOCUS_ZONES.length) % FOCUS_ZONES.length;
    setFocusZone(FOCUS_ZONES[nextIndex]);
  }

  function applyFocusStyles() {
    setLabeledPanel(menu, menuLabelText, focusZone === "menu");
    setLabeledPanel(
      diagnostics,
      diagnosticsLabelText,
      focusZone === "diagnostics",
    );
    setLabeledPanel(content, contentLabelText, focusZone === "content");
    setLabeledPanel(logs, logsLabelText, focusZone === "logs");

    menu.style.selected = {
      ...(menu.style.selected ?? {}),
      fg:
        focusZone === "menu"
          ? c420uiTheme.colors.activeCellFg
          : c420uiTheme.colors.menuInactiveSelectedFg,
      bg:
        focusZone === "menu"
          ? c420uiTheme.colors.activeCellBg
          : c420uiTheme.colors.menuInactiveSelectedBg,
      bold: focusZone === "menu",
    };
  }

  function applyLogPanelLabel() {
    logsLabelText = terminalTextSelectionModeActive
      ? "Logs - Text selection mode enabled"
      : "Logs";
    applyFocusStyles();
  }

  function showPlainLogsView() {
    appendLogText("[info] Plain logs view opened with F6.\n", "system");
    contentLabelText = "Plain Logs";
    content.setContent(
      [
        `{${c420uiTheme.colors.helpTitle}-fg}Plain Logs{/${c420uiTheme.colors.helpTitle}-fg}`,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Session log file:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.descriptionText}-fg}${sessionLogPath}{/${c420uiTheme.colors.descriptionText}-fg}`,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Visible c420ui log history:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        logHistory.length
          ? logHistory
              .map((line) =>
                line.replace(/[{}]/g, (c) => (c === "{" ? "\\\\{" : "\\\\}")),
              )
              .join("\n")
          : "  No visible logs yet.",
      ].join("\n"),
    );
    setFocusZone("content");
    applyFocusStyles();
    screen.render();
  }

  // --- Progress Management ---

  function clearProgress() {
    progress.setContent("");
    progressState = "idle";
  }

  function setProgressRunning(percent: number, label: string) {
    progressState = "running";
    setProgress(percent, label, false);
  }

  function setProgressSuccess(label = "Completed") {
    progressState = "success";
    setProgress(100, label, false);
  }

  function setProgressWarning(label = "Completed with warnings") {
    progressState = "warning";
    setProgress(100, label, false);
  }

  function setProgressError(label: string) {
    progressState = "failed";
    setProgress(0, `Error: ${label}`, true);
  }

  function setProgressCanceled() {
    progressState = "canceled";
    setProgress(0, "Canceled", true);
  }

  function clearProgressOnNavigation() {
    if (!running) {
      clearProgress();
    }
  }

  function setProgress(percent: number, label: string, isError = false) {
    const barWidth = 20;
    const fill = Math.max(
      0,
      Math.min(barWidth, Math.round((percent / 100) * barWidth)),
    );
    const bar = `${"█".repeat(fill)}${"░".repeat(barWidth - fill)}`;
    const color =
      isError || progressState === "failed" || progressState === "canceled"
        ? "red-fg"
        : progressState === "success" || progressState === "warning"
          ? "green-fg"
          : progressState === "running"
            ? "yellow-fg"
            : "white-fg";
    progress.setContent(
      `Progress: [{${color}}${bar}{/${color}}] ${percent}% - ${label}`,
    );
  }

  // --- Views & Rendering ---

  function renderSelectionDetails() {
    if (["install", "development", "maintenance"].includes(currentView)) {
      clearProgressOnNavigation();
      renderActionHelp(currentView, menu.selected);
    } else if (currentView === "settings") {
      setSettingsMenuItems();
      renderSettingsHelp();
    }
  }

  function scrollFocusedPanel(delta: number) {
    if (focusZone === "menu") {
      if (delta < 0) {
        menu.up(Math.abs(delta));
      } else {
        menu.down(delta);
      }
      renderSelectionDetails();
      return;
    }
    if (focusZone === "diagnostics") {
      diagnostics.scroll(delta);
    } else if (focusZone === "content") {
      content.scroll(delta);
    } else {
      logs.scroll(delta);
    }
  }

  function setFocusedPanelScroll(percent: number) {
    if (focusZone === "menu") {
      if (percent === 0) {
        menu.select(0);
      } else {
        menu.select(Math.max(0, (menu.items?.length ?? 1) - 1));
      }
      renderSelectionDetails();
      return;
    }
    if (focusZone === "diagnostics") {
      diagnostics.setScrollPerc(percent);
    } else if (focusZone === "content") {
      content.setScrollPerc(percent);
    } else {
      logs.setScrollPerc(percent);
    }
  }

  function renderActionHelp(view: View, selectedIndex: number) {
    if (!["install", "development", "maintenance"].includes(view)) {
      return;
    }
    const selected = currentActions[selectedIndex] ?? null;
    const base = [
      `{${c420uiTheme.colors.helpTitle}-fg}${view[0].toUpperCase() + view.slice(1)} Actions{/${c420uiTheme.colors.helpTitle}-fg}`,
    ];
    if (!selected) {
      return content.setContent(base.join("\n"));
    }
    const plannedBlock = isPlannedAction(selected)
      ? [
          "",
          `{${c420uiTheme.colors.infoItemTitle}-fg}Status:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
          `  {${c420uiTheme.colors.warning}-fg}Planned - visible in c420ui, but not executable in this phase.{/${c420uiTheme.colors.warning}-fg}`,
        ]
      : [];
    const warningBlock = selected.warning
      ? [
          "",
          `{${c420uiTheme.colors.infoItemTitle}-fg}Warning:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
          `  {${c420uiTheme.colors.error}-fg}${selected.warning}{/${c420uiTheme.colors.error}-fg}`,
        ]
      : [];
    content.setContent(
      [
        ...base,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Selected action:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Description:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.descriptionText}-fg}${selected.description ?? "No description available."}{/${c420uiTheme.colors.descriptionText}-fg}`,
        ...plannedBlock,
        ...warningBlock,
      ].join("\n"),
    );
  }

  function activeSettingsSectionIndex(): number {
    for (let index = menu.selected; index >= 0; index -= 1) {
      if (settingsItems[index]?.kind === "section") {
        return index;
      }
    }
    return -1;
  }

  function settingsItemLabel(item: SettingsItem, index: number): string {
    if (item.kind === "section") {
      const sectionColor =
        activeSettingsSectionIndex() === index
          ? c420uiTheme.colors.activeLabel
          : c420uiTheme.colors.inactiveLabel;
      return `{${sectionColor}-fg}{bold}${item.label}{/bold}{/${sectionColor}-fg}`;
    }
    if (item.kind === "note") {
      return `  {${c420uiTheme.colors.inactiveLabel}-fg}${item.label}{/${c420uiTheme.colors.inactiveLabel}-fg}`;
    }
    const enabled = Boolean(toolSettings.tool[item.key]);
    const checkbox = enabled ? "✓" : " ";
    const checkboxColor = enabled
      ? c420uiTheme.colors.activeCheckboxFg
      : c420uiTheme.colors.inactiveCheckboxFg;
    return `  {${checkboxColor}-fg}[${checkbox}]{/${checkboxColor}-fg} ${item.label}`;
  }

  function setSettingsMenuItems() {
    const selected = Math.min(
      Math.max(menu.selected, 0),
      settingsItems.length - 1,
    );
    updatingSettingsMenuItems = true;
    try {
      menu.setItems(settingsItems.map(settingsItemLabel));
      menu.select(selected);
    } finally {
      updatingSettingsMenuItems = false;
    }
  }

  function selectedSettingsItem(): SettingsItem | null {
    return settingsItems[menu.selected] ?? null;
  }

  function renderSettingsHelp() {
    const selected = selectedSettingsItem();
    const details: string[] = [
      `{${c420uiTheme.colors.helpTitle}-fg}Application Settings{/${c420uiTheme.colors.helpTitle}-fg}`,
      "",
      `{${c420uiTheme.colors.infoItemTitle}-fg}Settings file:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
      `  {${c420uiTheme.colors.descriptionText}-fg}${settingsPath}{/${c420uiTheme.colors.descriptionText}-fg}`,
      "",
    ];

    if (selected?.kind === "toggle") {
      details.push(
        `{${c420uiTheme.colors.infoItemTitle}-fg}Selected setting:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        "",
      );
      if (selected.key === "generalLogsEnabled") {
        details.push(
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Behavior{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  When enabled, Tool-level logs such as startup, settings, detection and authentication events are visible in the logs panel.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  When disabled, Action logs remain visible and critical Tool warnings/errors still appear. The session log file continues recording Tool diagnostics.{/${c420uiTheme.colors.descriptionText}-fg}`,
        );
      } else {
        details.push(
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Behavior{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Manual text selection mode disables c420ui mouse capture globally and keeps keyboard navigation active.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Changes take effect immediately and are saved for the next c420ui start. Use PageUp, PageDown, Home and End to scroll logs while this mode is active.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F5 continues to copy the visible log history to the clipboard.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F6 opens a plain logs view with the session log path for manual selection fallback.{/${c420uiTheme.colors.descriptionText}-fg}`,
        );
      }
    } else if (selected?.kind === "section") {
      details.push(
        `{${c420uiTheme.colors.infoItemTitle}-fg}Section:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        "",
        `{${c420uiTheme.colors.descriptionText}-fg}Tool settings affect this installer/development interface. Final build settings will apply to the packaged ${opts.project.projectName} app in a later phase.{/${c420uiTheme.colors.descriptionText}-fg}`,
      );
    } else {
      details.push(
        `{${c420uiTheme.colors.descriptionText}-fg}Use Enter or Space on a checkbox setting to toggle it. Application Settings are persistent c420ui state, not shell actions.{/${c420uiTheme.colors.descriptionText}-fg}`,
      );
    }

    content.setContent(details.join("\n"));
  }

  function persistSettings(reason: string) {
    try {
      saveToolSettings(toolSettings, opts.project.stateDirectoryName);
    } catch (error) {
      appendLogText(
        `[error] Settings could not be saved: ${error instanceof Error ? error.message : String(error)}\n`,
        "system",
      );
      return;
    }
    applyGlobalMouseMode();
    applyLogPanelLabel();
    if (currentView === "settings") {
      setSettingsMenuItems();
    }
    appendLogText(`[info] Settings changed (${reason}).\n`, "system");
    renderSettingsHelp();
    screen.render();
  }

  function toggleSelectedSetting() {
    const selected = selectedSettingsItem();
    if (selected?.kind !== "toggle") {
      return;
    }
    toolSettings = {
      ...toolSettings,
      tool: {
        ...toolSettings.tool,
        [selected.key]: !toolSettings.tool[selected.key],
      },
    };
    persistSettings(selected.key);
  }

  function renderCurrentContentPreservingProgress() {
    if (currentView === "main") {
      renderDiagnosticsBox();
      screen.render();
      return;
    }
    if (["install", "development", "maintenance"].includes(currentView)) {
      renderActionHelp(currentView, menu.selected);
      screen.render();
    }
    if (currentView === "settings") {
      renderSettingsHelp();
      screen.render();
    }
  }

  function setView(view: View) {
    currentView = view;
    clearProgressOnNavigation();

    if (view === "main") {
      if (!overviewStatus) {
        void refreshDetectedInstallations("enter-overview");
      }
      renderDiagnosticsBox();
      currentActions = [];
      menu.setItems(mainItems.map((item) => item.label));
      menuLabelText = "Main Menu";
      contentLabelText = "Overview";
      content.setContent(
        [
          `{${c420uiTheme.colors.logo}-fg}${opts.project.logoLines.join("\n")}{/${c420uiTheme.colors.logo}-fg}`,
          "",
          "Version:",
          `  {${c420uiTheme.colors.version}-fg}${opts.project.displayVersion}{/${c420uiTheme.colors.version}-fg}`,
          "",
          "Phase:",
          `  {${c420uiTheme.colors.phase}-fg}${opts.project.phase ?? "unknown"}{/${c420uiTheme.colors.phase}-fg}`,
          "",
          "Version Release Notes:",
          `  ${opts.releaseNotes}`,
          "",
          "Package / Version Information:",
          `  App ID: ${opts.project.appId}`,
          `  Executable: ${opts.project.executableName}`,
          `  Repository: ${opts.project.repositoryUrl}`,
        ].join("\n"),
      );
      applyFocusStyles();
      screen.render();
      return;
    }

    if (view === "help") {
      currentActions = [];
      menu.setItems(["Back to Main"]);
      menuLabelText = "Help";
      contentLabelText = "Help";
      content.setContent(
        [
          `{${c420uiTheme.colors.helpTitle}-fg}Help{/${c420uiTheme.colors.helpTitle}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Navigation{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tab / Shift+Tab       Move focus between menu, diagnostics, action panel and logs{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Up/Down               Move menu selection when the menu is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Enter                 Select action only when the menu is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Space                 Toggle setting checkbox only when Application Settings is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  PageUp/PageDown       Scroll the focused panel{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Home/End              Move the focused scrollable panel to start/end{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Esc                   Back to main or confirm exit{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  q                     Quit{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Panels{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Active panel: highlighted border and label{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Active cell: highlighted menu/settings row{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Alt+Up/Down or Shift+PgUp/PgDn still scroll action panel directly{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Logs{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F5             Copy logs to clipboard{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F6             View plain logs and session log path{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  PageUp/PageDown/Home/End{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Manual text selection mode can be enabled in Application Settings. It disables c420ui mouse capture globally, keeps keyboard navigation active, and some terminals may still require Shift during selection.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Launcher{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  ${opts.project.launcherCommand} opens the c420ui.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Any direct action flag runs CLI mode instead.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Do not run the Tool with sudo or as root; privileged actions ask for administrator authentication only when needed.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Root authentication failures are shown in a centered popup and the action is not started.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Settings{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tool settings file: ${settingsPath}{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tool settings affect this installer/development interface. Final build settings apply to the packaged app and are reserved for a later phase.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Status colors{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `  {${c420uiTheme.colors.activeLabel}-fg}Active panel border / label{/${c420uiTheme.colors.activeLabel}-fg}`,
          `  {${c420uiTheme.colors.activeCellFg}-fg}{${c420uiTheme.colors.activeCellBg}-bg}Active cell row{/${c420uiTheme.colors.activeCellBg}-bg}{/${c420uiTheme.colors.activeCellFg}-fg}`,
          `  {${c420uiTheme.colors.statusDetected}-fg}Detected / Completed{/${c420uiTheme.colors.statusDetected}-fg}`,
          `  {${c420uiTheme.colors.statusNotDetected}-fg}Not detected{/${c420uiTheme.colors.statusNotDetected}-fg}`,
          `  {${c420uiTheme.colors.warning}-fg}Running{/${c420uiTheme.colors.warning}-fg}`,
          `  {${c420uiTheme.colors.error}-fg}Error / Canceled{/${c420uiTheme.colors.error}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Clipboard order{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel{/${c420uiTheme.colors.descriptionText}-fg}`,
        ].join("\n"),
      );
      applyFocusStyles();
      screen.render();
      return;
    }

    if (view === "settings") {
      currentActions = [];
      setSettingsMenuItems();
      menuLabelText = "Application Settings";
      contentLabelText = "Application Settings";
      renderSettingsHelp();
      applyFocusStyles();
      screen.render();
      return;
    }

    const group =
      view === "install"
        ? "install"
        : view === "maintenance"
          ? "maintenance"
          : "development";

    currentActions = bridge
      .actions()
      .filter((action) => action.group === group) as InteractiveAction[];
    menu.setItems(currentActions.map((a) => a.label));
    menuLabelText = `${view[0].toUpperCase() + view.slice(1)} Actions`;
    contentLabelText = view[0].toUpperCase() + view.slice(1);
    renderActionHelp(view, menu.selected);
    applyFocusStyles();
    screen.render();
  }

  // --- Actions & Execution ---

  menu.on("select", async (_, index) => {
    if (running || modalActive || focusZone !== "menu") {
      return;
    }
    if (currentView === "main") {
      return setView(mainItems[index]?.view ?? "main");
    }
    if (currentView === "help") {
      return setView("main");
    }
    if (currentView === "settings") {
      toggleSelectedSetting();
      return;
    }
    const action = currentActions[index];
    if (!action) {
      return;
    }

    if (isPlannedAction(action)) {
      const message =
        action.description || `${action.label} is not implemented in this phase.`;
      await actionRunner.runAction(action, { dryRun: false });
      modalActive = true;
      await messageDialog(
        screen,
        "Planned action",
        [
          message,
          "",
          "This action is visible in c420ui for roadmap awareness, but it is not executable in this phase.",
        ].join("\n"),
      );
      modalActive = false;
      return;
    }

    const requiresConfirmation = interactiveActionRequiresConfirmation(action);
    let confirmed = false;

    if (requiresConfirmation) {
      modalActive = true;
      const ok = await confirmDialog(screen, {
        title: action.confirmationTitle ?? "Confirm",
        message:
          action.confirmationMessage ?? action.description ?? "Continue?",
        dangerous: action.dangerous === true,
      });
      modalActive = false;
      if (!ok) {
        return;
      }
      confirmed = true;
    }

    appendLogText(`[action] ${action.id} ${action.label}\n`, "system");
    writeSession(`[action] ${action.id} ${action.label}`);

    const result = await actionRunner.runAction(action, {
      confirmed,
      dryRun: false,
    });

    const installAction = action.id.startsWith("install-");
    let detectedNow = false;

    if (installAction) {
      const detectionKey = getInstallDetectionKey(action);
      if (detectionKey) {
        const latestStatus = await detectInstallationStatusNow();
        if (latestStatus) {
          overviewStatus = latestStatus;
        }
        detectedNow = Boolean(latestStatus?.installations?.[detectionKey]);
      }
    }

    if (result.status === "canceled") {
      setProgressCanceled();
    } else if (installAction && detectedNow && result.code !== 0) {
      setProgressWarning("Completed with warnings");
    } else if (result.code === 0 || (installAction && detectedNow)) {
      setProgressSuccess("Completed");
    } else if (result.status === "planned") {
      setProgressWarning("Planned action");
    } else {
      setProgressError(`exit code ${result.code ?? "unknown"}`);
    }

    appendLogText(
      `[info] Action finished (${result.status}:${result.code}).\n`,
      "system",
    );
    await refreshDetectedInstallations(`action:${action.id}`);
    running = false;
    renderActionHelp(currentView, menu.selected);
    screen.render();
  });

  // --- Input & Keybindings ---

  const confirmExit = async () => {
    if (modalActive) {
      return;
    }
    modalActive = true;
    const ok = await confirmDialog(screen, {
      title: "Exit Application",
      message: "Do you want to exit the application?",
      confirmLabel: "Yes",
      cancelLabel: "No",
    });
    modalActive = false;
    if (ok) {
      screen.destroy();
      process.exit(0);
    }
  };

  screen.key(["q"], () => {
    void confirmExit();
  });

  screen.key(["tab"], () => {
    if (!modalActive) {
      moveFocus(1);
    }
  });

  screen.key(["S-tab", "backtab"], () => {
    if (!modalActive) {
      moveFocus(-1);
    }
  });

  screen.key(["escape"], () => {
    if (modalActive) {
      return;
    }
    if (running) {
      void confirmExit();
      return;
    }
    if (currentView === "main") {
      void confirmExit();
      return;
    }
    setView("main");
  });

  screen.key(["C-c"], () => {
    if (modalActive) {
      return;
    }
    const now = Date.now();
    if (running) {
      if (now - lastCtrlCAt < 1500) {
        void confirmExit();
        return;
      }
      lastCtrlCAt = now;
      if (actionRunner.cancel()) {
        appendLogText(
          "[warn] Interrupt requested for running action. Press Ctrl+C again to exit application.\n",
          "system",
        );
      } else {
        appendLogText(
          "[warn] Action is running. Press Ctrl+C again to exit application.\n",
          "system",
        );
      }
      return;
    }
    void confirmExit();
  });

  screen.key(["f5"], () => {
    const result = copyTextToClipboard(logHistory.join("\n"));
    appendLogText(
      `${result.ok ? "[ok]" : "[warn]"} ${result.message}\n`,
      "system",
    );
  });

  screen.key(["f6"], () => {
    if (!modalActive) {
      showPlainLogsView();
    }
  });

  screen.key(["S-pageup", "M-up"], () => {
    content.scroll(-5);
    screen.render();
  });

  screen.key(["S-pagedown", "M-down"], () => {
    content.scroll(5);
    screen.render();
  });

  screen.key(["pageup"], () => {
    if (!modalActive) {
      scrollFocusedPanel(-10);
    }
    screen.render();
  });

  screen.key(["pagedown"], () => {
    if (!modalActive) {
      scrollFocusedPanel(10);
    }
    screen.render();
  });

  screen.key(["home"], () => {
    if (!modalActive) {
      setFocusedPanelScroll(0);
    }
    screen.render();
  });

  screen.key(["end"], () => {
    if (!modalActive) {
      setFocusedPanelScroll(100);
    }
    screen.render();
  });

  screen.key(["?"], () => {
    if (!running && !modalActive) {
      setView("help");
    }
  });

  screen.key(["space"], () => {
    if (
      !running &&
      !modalActive &&
      focusZone === "menu" &&
      currentView === "settings"
    ) {
      toggleSelectedSetting();
    }
  });

  // --- Mouse Support ---

  menu.on("click", () => {
    if (!modalActive) {
      setFocusZone("menu");
    }
  });

  diagnostics.on("click", () => {
    if (!modalActive) {
      setFocusZone("diagnostics");
    }
  });

  content.on("click", () => {
    if (!modalActive) {
      setFocusZone("content");
    }
  });

  logs.on("click", () => {
    if (!modalActive) {
      setFocusZone("logs");
    }
  });

  // --- Menu Event Listeners ---

  menu.on("keypress", (_, key) => {
    if (updatingSettingsMenuItems) {
      return;
    }
    if (
      (key.name === "up" || key.name === "down") &&
      ["install", "development", "maintenance"].includes(currentView)
    ) {
      renderSelectionDetails();
      screen.render();
    }
    if (
      (key.name === "up" || key.name === "down") &&
      currentView === "settings"
    ) {
      renderSelectionDetails();
      screen.render();
    }
  });

  menu.on("select item", () => {
    if (updatingSettingsMenuItems) {
      return;
    }
    if (["install", "development", "maintenance"].includes(currentView)) {
      renderSelectionDetails();
      screen.render();
    }
    if (currentView === "settings") {
      renderSelectionDetails();
      screen.render();
    }
  });

  // --- Startup ---

  applyLogPanelLabel();
  importLauncherSessionLog();

  appendLogText(
    `[info] c420ui started. project=${opts.project.projectName} version=${opts.project.displayVersion} phase=${opts.project.phase}\n`,
    "system",
  );
  appendLogText(`[info] Settings loaded from ${settingsPath}.\n`, "system");

  setView("main");
  void refreshDetectedInstallations("startup");
  renderDiagnosticsBox();
  menu.focus();

  if (options.startupTasks?.length) {
    setImmediate(() => {
      void runC420UIStartupTasks(options.startupTasks ?? [], (text) => {
        appendLogText(text, "system");
      }).then(() => screen.render());
    });
  }

  return screen;
}
