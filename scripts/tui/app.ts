import blessed from "blessed";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { CANVA_LOGO_LINES } from "./logo";
import { getActionsByGroup, type TuiAction } from "./action-registry";
import {
  confirmDialog,
  errorDialog,
  inputDialog,
  messageDialog,
} from "./modal";
import { runAction } from "./process-runner";
import { tuiTheme } from "./theme";
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

type FocusZone = "menu" | "diagnostics" | "content" | "logs";

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

// --- Main Application Entry ---

export function createApp(opts: {
  version: string;
  phase: string;
  rootDir: string;
  title: string;
  toolTitle: string;
  releaseNotes: string;
}) {
  // --- Initialization & State ---

  let toolSettings = loadToolSettings();
  const settingsPath = toolSettingsPath();
  const terminalTextSelectionModeActive =
    toolSettings.tool.terminalTextSelectionMode;
  const tuiMouseEnabled = !terminalTextSelectionModeActive;

  const footerContent = [
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

  const screen = blessed.screen({
    smartCSR: true,
    title: opts.title,
    fullUnicode: true,
  });

  // --- UI Widgets ---

  const header = blessed.box({
    top: 0,
    height: 2,
    width: "100%",
    tags: true,
    content: `{bold}${opts.toolTitle}{/bold}\nPhase: ${opts.phase}`,
    style: tuiTheme.header,
  });

  const menu = blessed.list({
    top: 2,
    left: 0,
    width: "32%",
    height: "40%",
    keys: true,
    mouse: tuiMouseEnabled,
    border: "line",
    tags: true,
    label: "Main Menu",
    style: tuiTheme.menu,
  });

  const diagnostics = blessed.box({
    top: "42%",
    left: 0,
    width: "32%",
    height: "55%-2",
    border: "line",
    label: "Detected Installations",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: tuiTheme.content,
  });

  const content = blessed.box({
    top: 2,
    left: "32%",
    width: "68%",
    height: "36%",
    border: "line",
    label: "Overview",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: tuiTheme.content,
  });

  const logs = blessed.log({
    top: "38%",
    left: "32%",
    width: "68%",
    height: "59%",
    border: "line",
    label: "Logs",
    keys: true,
    mouse: tuiMouseEnabled,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: tuiTheme.colors.surfaceAlt,
      },
      style: {
        bg: tuiTheme.colors.lightBlue,
      },
    },
    scrollback: MAX_LOG_HISTORY_LINES,
    tags: true,
    style: tuiTheme.logs,
  });

  const footer = blessed.box({
    bottom: 0,
    height: 1,
    width: "100%",
    tags: true,
    content: footerContent,
    style: tuiTheme.footer,
  });

  const progress = blessed.box({
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

  screen.append(header);
  screen.append(menu);
  screen.append(diagnostics);
  screen.append(content);
  screen.append(logs);
  screen.append(progress);
  screen.append(footer);

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

  applyProgramMouseMode();

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
      label: "Canva Linux Install and Development Tool",
    },
    {
      kind: "toggle",
      key: "generalLogsEnabled",
      label: "Enable general logs for Canva Linux Install and Development Tool",
    },
    {
      kind: "toggle",
      key: "terminalTextSelectionMode",
      label: "Prefer native terminal text selection on next TUI start",
    },
    {
      kind: "section",
      label: "Canva Linux final build",
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
  let currentActions: TuiAction[] = [];
  let running = false;
  let modalActive = false;
  let currentChild: ChildProcess | null = null;
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
    process.env.CANVA_TOOL_SESSION_LOG ||
    path.join(
      process.env.XDG_STATE_HOME ||
        path.join(process.env.HOME || ".", ".local/state"),
      "canva-linux",
      "tool-session.log",
    );

  const launcherSessionId = process.env.CANVA_TOOL_SESSION_ID?.trim() || "";

  // --- Logging & Session Management ---

  function readExistingSessionLog(logPath: string): string {
    try {
      return fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
    } catch {
      return "";
    }
  }

  function openSessionStream(logPath: string): Writable | null {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      const stream = fs.createWriteStream(logPath, { flags: "a" });
      stream.on("error", () => {
        // Keep the TUI alive when the configured state path becomes unavailable.
      });
      return stream;
    } catch {
      return null;
    }
  }

  const launcherSessionLog = readExistingSessionLog(sessionLogPath);
  const sessionStream = openSessionStream(sessionLogPath);

  const writeSession = (line: string) => {
    sessionStream?.write(`${line}\n`);
  };

  writeSession("[mode] tui");

  process.on("exit", () => {
    writeSession("[session] ended");
  });

  // --- Detection & Diagnostics ---

  let overviewStatus: any = null;
  let overviewDetectionPromise: Promise<any | null> | null = null;
  let overviewDetectionError: string | null = null;

  const detectedSummary = (s: any) => {
    if (!s) {
      return [
        `  Native Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
        `  Flatpak Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
        `  AppImage artifacts: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
      ];
    }
    const i = s.installations;
    const fmt = (detected: boolean, version: string | undefined) => {
      if (!detected) {
        return `{${tuiTheme.colors.statusNotDetected}-fg}not detected{/${tuiTheme.colors.statusNotDetected}-fg}`;
      }
      const v =
        version && version.trim()
          ? `v${version.trim().replace(/^v/, "")}`
          : "version unknown";
      return `{${tuiTheme.colors.statusDetected}-fg}detected{/${tuiTheme.colors.statusDetected}-fg}      ${v}`;
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
        `  {${tuiTheme.colors.error}-fg}Detection error{/${tuiTheme.colors.error}-fg}\n  ${overviewDetectionError}`,
      );
      return;
    }
    diagnostics.setContent(detectedSummary(overviewStatus).join("\n"));
  }

  function refreshDetectedInstallations(
    reason = "unknown",
  ): Promise<any | null> {
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
    actionId: string,
  ): keyof NonNullable<any["installations"]> | null {
    switch (actionId) {
      case "install-native-system":
        return "nativeSystem";
      case "install-native-user":
        return "nativeUser";
      case "install-flatpak-system":
        return "flatpakSystem";
      case "install-flatpak-user":
        return "flatpakUser";
      default:
        return null;
    }
  }

  async function actionNeedsRootForDetectedSystem(
    action: TuiAction,
  ): Promise<boolean> {
    if (!["purge", "uninstall-detected"].includes(action.id)) {
      return false;
    }
    const latestStatus =
      (await refreshDetectedInstallations(`root-check:${action.id}`)) ??
      overviewStatus;
    return Boolean(
      latestStatus?.installations?.nativeSystem ||
        latestStatus?.installations?.flatpakSystem,
    );
  }

  function parseOverviewStatusOutput(output: string): any | null {
    const trimmed = output.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  function detectInstallationStatusNow(): Promise<any | null> {
    return new Promise((resolve) => {
      const child = spawn("scripts/run-core-entry.sh", ["overview-status"], {
        cwd: opts.rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const finish = (status: any | null) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(status);
      };
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", (error) => {
        appendLogText(
          `[error] Detection status failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
          "system",
        );
        finish(null);
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }
        if (stderr.trim()) {
          appendLogText(stderr, "system");
        }
        if ((code ?? 1) !== 0) {
          appendLogText(
            `[warn] Detection status exited with code ${code ?? "unknown"}.\n`,
            "system",
          );
          finish(null);
          return;
        }
        finish(parseOverviewStatusOutput(stdout));
      });
    });
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
    return `{${tuiTheme.colors.activeLabel}-fg}${label}{/${tuiTheme.colors.activeLabel}-fg}`;
  }

  function inactiveLabel(label: string): string {
    return `{${tuiTheme.colors.inactiveLabel}-fg}${label}{/${tuiTheme.colors.inactiveLabel}-fg}`;
  }

  function setWidgetBorder(
    widget: blessed.Widgets.BoxElement,
    active: boolean,
  ) {
    widget.style.border = {
      ...(widget.style.border ?? {}),
      fg: active
        ? tuiTheme.colors.activeBorder
        : tuiTheme.colors.inactiveBorder,
    };
  }

  function setLabeledPanel(
    widget: blessed.Widgets.BoxElement,
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
          ? tuiTheme.colors.activeCellFg
          : tuiTheme.colors.menuInactiveSelectedFg,
      bg:
        focusZone === "menu"
          ? tuiTheme.colors.activeCellBg
          : tuiTheme.colors.menuInactiveSelectedBg,
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
        `{${tuiTheme.colors.helpTitle}-fg}Plain Logs{/${tuiTheme.colors.helpTitle}-fg}`,
        "",
        `{${tuiTheme.colors.infoItemTitle}-fg}Session log file:{/${tuiTheme.colors.infoItemTitle}-fg}`,
        `  {${tuiTheme.colors.descriptionText}-fg}${sessionLogPath}{/${tuiTheme.colors.descriptionText}-fg}`,
        "",
        `{${tuiTheme.colors.infoItemTitle}-fg}Visible TUI log history:{/${tuiTheme.colors.infoItemTitle}-fg}`,
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

  // --- Modal Helpers ---

  function sanitizeAuthOutput(text: string, password: string): string {
    const cleaned = text.replace(/\r/g, "").trim();
    if (!password) {
      return cleaned;
    }
    return cleaned.split(password).join("[redacted]");
  }

  function formatAuthFailureMessage(detail: string): string {
    return [
      "Administrator authentication failed",
      "",
      detail || "sudo: a password is required",
      "",
      "The action was not started.",
    ].join("\n");
  }

  function formatAuthTimeoutMessage(detail?: string): string {
    return [
      "Administrator authentication timed out",
      "",
      detail || "The administrator password was not validated in time.",
      "",
      "The action was not started.",
    ].join("\n");
  }

  function didAuthTimeout(error: Error | undefined, message: string): boolean {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === "ETIMEDOUT" || /timed out/i.test(message);
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
      `{${tuiTheme.colors.helpTitle}-fg}${view[0].toUpperCase() + view.slice(1)} Actions{/${tuiTheme.colors.helpTitle}-fg}`,
    ];
    if (!selected) {
      return content.setContent(base.join("\n"));
    }
    const warningBlock = selected.warning
      ? [
          "",
          `{${tuiTheme.colors.infoItemTitle}-fg}Warning:{/${tuiTheme.colors.infoItemTitle}-fg}`,
          `  {${tuiTheme.colors.error}-fg}${selected.warning}{/${tuiTheme.colors.error}-fg}`,
        ]
      : [];
    content.setContent(
      [
        ...base,
        "",
        `{${tuiTheme.colors.infoItemTitle}-fg}Selected action:{/${tuiTheme.colors.infoItemTitle}-fg}`,
        `  {${tuiTheme.colors.infoText}-fg}${selected.label}{/${tuiTheme.colors.infoText}-fg}`,
        "",
        `{${tuiTheme.colors.infoItemTitle}-fg}Description:{/${tuiTheme.colors.infoItemTitle}-fg}`,
        `  {${tuiTheme.colors.descriptionText}-fg}${selected.description ?? "No description available."}{/${tuiTheme.colors.descriptionText}-fg}`,
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
          ? tuiTheme.colors.activeLabel
          : tuiTheme.colors.inactiveLabel;
      return `{${sectionColor}-fg}{bold}${item.label}{/bold}{/${sectionColor}-fg}`;
    }
    if (item.kind === "note") {
      return `  {${tuiTheme.colors.inactiveLabel}-fg}${item.label}{/${tuiTheme.colors.inactiveLabel}-fg}`;
    }
    const enabled = Boolean(toolSettings.tool[item.key]);
    const checkbox = enabled ? "✓" : " ";
    const checkboxColor = enabled
      ? tuiTheme.colors.activeCheckboxFg
      : tuiTheme.colors.inactiveCheckboxFg;
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
      `{${tuiTheme.colors.helpTitle}-fg}Application Settings{/${tuiTheme.colors.helpTitle}-fg}`,
      "",
      `{${tuiTheme.colors.infoItemTitle}-fg}Settings file:{/${tuiTheme.colors.infoItemTitle}-fg}`,
      `  {${tuiTheme.colors.descriptionText}-fg}${settingsPath}{/${tuiTheme.colors.descriptionText}-fg}`,
      "",
    ];

    if (selected?.kind === "toggle") {
      details.push(
        `{${tuiTheme.colors.infoItemTitle}-fg}Selected setting:{/${tuiTheme.colors.infoItemTitle}-fg}`,
        `  {${tuiTheme.colors.infoText}-fg}${selected.label}{/${tuiTheme.colors.infoText}-fg}`,
        "",
      );
      if (selected.key === "generalLogsEnabled") {
        details.push(
          `{${tuiTheme.colors.helpSectionTitle}-fg}Behavior{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  When enabled, Tool-level logs such as startup, settings, detection and authentication events are visible in the logs panel.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  When disabled, Action logs remain visible and critical Tool warnings/errors still appear. The session log file continues recording Tool diagnostics.{/${tuiTheme.colors.descriptionText}-fg}`,
        );
      } else {
        details.push(
          `{${tuiTheme.colors.helpSectionTitle}-fg}Behavior{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  When enabled before startup, terminal text selection mode disables TUI mouse handling for the session.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Changes to this setting take effect the next time the TUI starts. Use PageUp, PageDown, Home and End to scroll logs while this mode is active.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  F5 continues to copy the visible log history to the clipboard.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  F6 opens a plain logs view with the session log path for manual selection fallback.{/${tuiTheme.colors.descriptionText}-fg}`,
        );
      }
    } else if (selected?.kind === "section") {
      details.push(
        `{${tuiTheme.colors.infoItemTitle}-fg}Section:{/${tuiTheme.colors.infoItemTitle}-fg}`,
        `  {${tuiTheme.colors.infoText}-fg}${selected.label}{/${tuiTheme.colors.infoText}-fg}`,
        "",
        `{${tuiTheme.colors.descriptionText}-fg}Tool settings affect this installer/development interface. Final build settings will apply to the packaged Canva Linux app in a later phase.{/${tuiTheme.colors.descriptionText}-fg}`,
      );
    } else {
      details.push(
        `{${tuiTheme.colors.descriptionText}-fg}Use Enter or Space on a checkbox setting to toggle it. Application Settings are persistent TUI state, not shell actions.{/${tuiTheme.colors.descriptionText}-fg}`,
      );
    }

    content.setContent(details.join("\n"));
  }

  function persistSettings(reason: string) {
    try {
      saveToolSettings(toolSettings);
    } catch (error) {
      appendLogText(
        `[error] Settings could not be saved: ${error instanceof Error ? error.message : String(error)}\n`,
        "system",
      );
      return;
    }
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
          `{${tuiTheme.colors.logo}-fg}${CANVA_LOGO_LINES.join("\n")}{/${tuiTheme.colors.logo}-fg}`,
          "",
          "Version:",
          `  {${tuiTheme.colors.version}-fg}${opts.version}{/${tuiTheme.colors.version}-fg}`,
          "",
          "Phase:",
          `  {${tuiTheme.colors.phase}-fg}${opts.phase}{/${tuiTheme.colors.phase}-fg}`,
          "",
          "Version Release Notes:",
          `  ${opts.releaseNotes}`,
          "",
          "Package / Version Information:",
          "  App ID: io.github.coletivo420.canva-linux",
          "  Executable: canva-linux",
          "  Repository: https://github.com/coletivo420/canva-linux",
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
          `{${tuiTheme.colors.helpTitle}-fg}Help{/${tuiTheme.colors.helpTitle}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Navigation{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Tab / Shift+Tab       Move focus between menu, diagnostics, action panel and logs{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Up/Down               Move menu selection when the menu is focused{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Enter                 Select action only when the menu is focused{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Space                 Toggle setting checkbox only when Application Settings is focused{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  PageUp/PageDown       Scroll the focused panel{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Home/End              Move the focused scrollable panel to start/end{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Esc                   Back to main or confirm exit{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  q                     Quit{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Panels{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Active panel: highlighted border and label{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Active cell: highlighted menu/settings row{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Alt+Up/Down or Shift+PgUp/PgDn still scroll action panel directly{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Logs{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  F5             Copy logs to clipboard{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  F6             View plain logs and session log path{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  PageUp/PageDown/Home/End{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Terminal text selection can be enabled in Application Settings. It disables TUI mouse capture globally on the next start, but some terminals may still require Shift during selection.{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Launcher{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  ./canva-linux.sh opens the TUI.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Any direct action flag runs CLI mode instead.{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Do not run the Tool with sudo or as root; privileged actions ask for administrator authentication only when needed.{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Settings{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Tool settings file: ${settingsPath}{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Tool settings affect this installer/development interface. Final build settings apply to the packaged app and are reserved for a later phase.{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Status colors{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `  {${tuiTheme.colors.activeLabel}-fg}Active panel border / label{/${tuiTheme.colors.activeLabel}-fg}`,
          `  {${tuiTheme.colors.activeCellFg}-fg}{${tuiTheme.colors.activeCellBg}-bg}Active cell row{/${tuiTheme.colors.activeCellBg}-bg}{/${tuiTheme.colors.activeCellFg}-fg}`,
          `  {${tuiTheme.colors.statusDetected}-fg}Detected / Completed{/${tuiTheme.colors.statusDetected}-fg}`,
          `  {${tuiTheme.colors.statusNotDetected}-fg}Not detected{/${tuiTheme.colors.statusNotDetected}-fg}`,
          `  {${tuiTheme.colors.warning}-fg}Running{/${tuiTheme.colors.warning}-fg}`,
          `  {${tuiTheme.colors.error}-fg}Error / Canceled{/${tuiTheme.colors.error}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Clipboard order{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel{/${tuiTheme.colors.descriptionText}-fg}`,
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

    currentActions = getActionsByGroup(group, opts.rootDir);
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

    if (action.dangerous) {
      modalActive = true;
      const ok = await confirmDialog(screen, {
        title: action.confirmationTitle ?? "Confirm",
        message:
          action.confirmationMessage ?? action.description ?? "Continue?",
        dangerous: true,
      });
      modalActive = false;
      if (!ok) {
        return;
      }
    }

    const rootRequired =
      action.requiresRoot || (await actionNeedsRootForDetectedSystem(action));

    if (rootRequired) {
      appendLogText("[info] Root authentication popup opened.\n", "system");
      modalActive = true;
      const passwordResult = await inputDialog(
        screen,
        "Administrator authentication",
        "Enter root password (30s timeout):",
        30000,
      );
      modalActive = false;

      if (passwordResult.status === "timeout") {
        const message = [
          "Administrator authentication timed out",
          "",
          "The action was not started.",
        ].join("\n");
        appendLogText("[warn] Root authentication timed out.\n", "system");
        setProgressError("root authentication timed out");
        modalActive = true;
        await errorDialog(screen, "Administrator authentication", message);
        modalActive = false;
        return;
      }

      if (passwordResult.status === "canceled" || !passwordResult.value) {
        const message = [
          "Administrator authentication canceled",
          "",
          "The action was not started.",
        ].join("\n");
        appendLogText("[warn] Root authentication canceled.\n", "system");
        setProgressError("root authentication canceled");
        modalActive = true;
        await messageDialog(screen, "Administrator authentication", message);
        modalActive = false;
        return;
      }

      const password = passwordResult.value;
      const auth = spawnSync(
        "bash",
        ["scripts/sudo-common.sh", "--validate-stdin"],
        {
          cwd: opts.rootDir,
          input: `${password}\n`,
          encoding: "utf8",
          timeout: 30000,
          env: {
            ...process.env,
            ...(action.env ?? {}),
          },
        },
      );

      if ((auth.status ?? 1) !== 0) {
        const sudoMessage = sanitizeAuthOutput(
          auth.stderr || auth.stdout || "sudo: a password is required",
          password,
        );
        if (didAuthTimeout(auth.error, sudoMessage)) {
          const popupMessage = formatAuthTimeoutMessage(sudoMessage);
          appendLogText(`[error] ${popupMessage}\n`, "system");
          setProgressError("root authentication timed out");
          modalActive = true;
          await errorDialog(
            screen,
            "Administrator authentication timed out",
            popupMessage,
          );
          modalActive = false;
          return;
        }
        const popupMessage = formatAuthFailureMessage(sudoMessage);
        appendLogText(`[error] ${popupMessage}\n`, "system");
        setProgressError("root authentication failed");
        modalActive = true;
        await errorDialog(
          screen,
          "Administrator authentication failed",
          popupMessage,
        );
        modalActive = false;
        return;
      }
      appendLogText("[info] Root authentication succeeded.\n", "system");
    }

    if (!action.command) {
      return;
    }

    running = true;
    progressState = "running";
    setProgressRunning(5, "Starting");
    appendLogText(
      `$ ${action.command} ${(action.args ?? []).join(" ")}\n`,
      "stdout",
    );
    writeSession(`[action] ${action.id} ${action.label}`);

    currentChild = runAction(
      action.command,
      action.args ?? [],
      (txt, src) => appendLogText(txt, src),
      async ({ code, signal }) => {
        currentChild = null;
        const installAction = action.id.startsWith("install-");
        let detectedNow = false;

        if (installAction) {
          const detectionKey = getInstallDetectionKey(action.id);
          if (detectionKey) {
            const latestStatus = await detectInstallationStatusNow();
            if (latestStatus) {
              overviewStatus = latestStatus;
            }
            detectedNow = Boolean(latestStatus?.installations?.[detectionKey]);
          }
        }

        if (signal === "SIGINT") {
          setProgressCanceled();
        } else if (installAction && detectedNow && code !== 0) {
          setProgressWarning("Completed with warnings");
        } else if (code === 0 || (installAction && detectedNow)) {
          setProgressSuccess("Completed");
        } else {
          setProgressError(signal ?? `exit code ${code ?? "unknown"}`);
        }

        appendLogText(
          `[info] Action finished (${signal ?? code ?? "unknown"}).\n`,
          "system",
        );
        await refreshDetectedInstallations(`action:${action.id}`);
        running = false;
        renderActionHelp(currentView, menu.selected);
        screen.render();
      },
      {
        cwd: opts.rootDir,
        env: {
          ...(action.env ?? {}),
          ...(rootRequired ? { CANVA_TUI_ROOT_AUTH: "1" } : {}),
        },
      },
    );
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
    if (running && currentChild) {
      if (now - lastCtrlCAt < 1500) {
        void confirmExit();
        return;
      }
      lastCtrlCAt = now;
      currentChild.kill("SIGINT");
      appendLogText(
        "[warn] Interrupt requested. Press Ctrl+C again to exit application.\n",
        "system",
      );
      setProgressCanceled();
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
    `[info] TUI started. version=${opts.version} phase=${opts.phase}\n`,
    "system",
  );
  appendLogText(`[info] Settings loaded from ${settingsPath}.\n`, "system");

  setView("main");
  void refreshDetectedInstallations("startup");
  renderDiagnosticsBox();
  menu.focus();

  return screen;
}
