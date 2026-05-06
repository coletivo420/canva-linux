import blessed from "blessed";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { CANVA_LOGO_LINES } from "./logo";
import { getActionsByGroup, type TuiAction } from "./action-registry";
import { confirmDialog, inputDialog } from "./modal";
import { runAction } from "./process-runner";
import { tuiTheme } from "./theme";
import { copyTextToClipboard } from "./clipboard";
import fs from "node:fs";
import path from "node:path";

type View = "main" | "install" | "development" | "maintenance" | "help";
type ProgressState =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "failed"
  | "canceled";
type LogSource = "stdout" | "stderr" | "system";

const MAX_LOG_HISTORY_LINES = 5000;

export function createApp(opts: {
  version: string;
  phase: string;
  rootDir: string;
  title: string;
  toolTitle: string;
  releaseNotes: string;
}) {
  const screen = blessed.screen({
    smartCSR: true,
    title: opts.title,
    fullUnicode: true,
  });
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
    mouse: true,
    border: "line",
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
    mouse: true,
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
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: { bg: tuiTheme.colors.surfaceAlt },
      style: { bg: tuiTheme.colors.lightBlue },
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
    content:
      "{bold}q{/bold} Quit | {bold}Esc{/bold} Back | {bold}Enter{/bold} Select | {bold}F5{/bold} Copy Logs | {bold}?{/bold} Help",
    style: tuiTheme.footer,
  });
  const progress = blessed.box({
    bottom: 1,
    height: 1,
    left: "32%",
    width: "68%",
    tags: true,
    content: "",
    style: { fg: "white", bg: "black" },
  });
  screen.append(header);
  screen.append(menu);
  screen.append(diagnostics);
  screen.append(content);
  screen.append(logs);
  screen.append(progress);
  screen.append(footer);

  const mainItems: Array<{ label: string; view: View }> = [
    { label: "Install", view: "install" },
    { label: "Development", view: "development" },
    { label: "Maintenance & Uninstall", view: "maintenance" },
    { label: "Help", view: "help" },
  ];

  let currentView: View = "main";
  let currentActions: TuiAction[] = [];
  let running = false;
  let modalActive = false;
  let currentChild: ChildProcess | null = null;
  let progressState: ProgressState = "idle";
  let lastCtrlCAt = 0;
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
  fs.mkdirSync(path.dirname(sessionLogPath), { recursive: true });
  const sessionStream = fs.createWriteStream(sessionLogPath, { flags: "w" });
  const writeSession = (line: string) => sessionStream.write(`${line}\n`);
  writeSession("[mode] tui");
  process.on("exit", () => {
    writeSession("[session] ended");
  });

  let overviewStatus: any = null;
  let overviewDetectionPromise: Promise<any | null> | null = null;
  let overviewDetectionError: string | null = null;

  const detectedSummary = (s: any) => {
    if (!s)
      return [
        `  Native Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
        `  Flatpak Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
        `  AppImage artifacts: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
      ];
    const i = s.installations;
    const fmt = (detected: boolean, version: string | undefined) => {
      if (!detected)
        return `{${tuiTheme.colors.statusNotDetected}-fg}not detected{/${tuiTheme.colors.statusNotDetected}-fg}`;
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
    if (overviewDetectionPromise) return overviewDetectionPromise;
    appendLogText(
      `[info] Refreshing detected installations (${reason}).\n`,
      "system",
    );
    overviewDetectionPromise = detectInstallationStatusNow()
      .then((latestStatus) => {
        if (latestStatus) {
          overviewStatus = latestStatus;
          overviewDetectionError = null;
        } else {
          overviewDetectionError = "Unable to parse status output";
          appendLogText("[error] Detection status parsing failed.\n", "system");
        }
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
    if (!["purge", "uninstall-detected"].includes(action.id)) return false;
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
    if (!trimmed) return null;
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
        if (settled) return;
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
        if (settled) return;
        if (stderr.trim()) appendLogText(stderr, "system");
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

  function appendLogLine(line: string, source: LogSource) {
    writeSession(`[${source}] ${line}`);
    logHistory.push(line);
    if (logHistory.length > MAX_LOG_HISTORY_LINES) logHistory.shift();
    const msg = line.replace(/[{}]/g, (c) => (c === "{" ? "\\{" : "\\}"));
    if (source === "stderr") logs.log(`{red-fg}${msg}{/red-fg}`);
    else if (source === "system") logs.log(`{cyan-fg}${msg}{/cyan-fg}`);
    else logs.log(msg);
  }
  function appendLogText(text: string, source: LogSource = "stdout") {
    logBuffers[source] += text;
    while (true) {
      const m = logBuffers[source].match(/\r?\n/);
      if (!m || m.index === undefined) break;
      const i = m.index;
      const n = m[0].length;
      appendLogLine(logBuffers[source].slice(0, i), source);
      logBuffers[source] = logBuffers[source].slice(i + n);
    }
    screen.render();
  }

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
    if (!running) clearProgress();
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

  function renderActionHelp(view: View, selectedIndex: number) {
    if (!["install", "development", "maintenance"].includes(view)) return;
    const selected = currentActions[selectedIndex] ?? null;
    const base = [
      `{${tuiTheme.colors.helpTitle}-fg}${view[0].toUpperCase() + view.slice(1)} Actions{/${tuiTheme.colors.helpTitle}-fg}`,
    ];
    if (!selected) return content.setContent(base.join("\n"));
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
  }

  function setView(view: View) {
    currentView = view;
    clearProgressOnNavigation();
    if (view === "main") {
      if (!overviewStatus) void refreshDetectedInstallations("enter-overview");
      renderDiagnosticsBox();
      currentActions = [];
      menu.setItems(mainItems.map((item) => item.label));
      content.setLabel("Overview");
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
      screen.render();
      return;
    }
    if (view === "help") {
      currentActions = [];
      menu.setItems(["Back to Main"]);
      content.setLabel("Help");
      content.setContent(
        [
          `{${tuiTheme.colors.helpTitle}-fg}Help{/${tuiTheme.colors.helpTitle}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Navigation{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Up/Down        Move selection{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Enter          Select action{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Esc            Confirm exit{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  q              Quit{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Panels{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  Alt+Up/Down or Shift+PgUp/PgDn scroll action panel{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Logs{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  F5             Copy logs to clipboard{/${tuiTheme.colors.descriptionText}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  PageUp/PageDown/Home/End{/${tuiTheme.colors.descriptionText}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Status colors{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `  {${tuiTheme.colors.statusDetected}-fg}Detected / Completed{/${tuiTheme.colors.statusDetected}-fg}`,
          `  {${tuiTheme.colors.statusNotDetected}-fg}Not detected{/${tuiTheme.colors.statusNotDetected}-fg}`,
          `  {${tuiTheme.colors.warning}-fg}Running{/${tuiTheme.colors.warning}-fg}`,
          `  {${tuiTheme.colors.error}-fg}Error / Canceled{/${tuiTheme.colors.error}-fg}`,
          "",
          `{${tuiTheme.colors.helpSectionTitle}-fg}Clipboard order{/${tuiTheme.colors.helpSectionTitle}-fg}`,
          `{${tuiTheme.colors.descriptionText}-fg}  wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel{/${tuiTheme.colors.descriptionText}-fg}`,
        ].join("\n"),
      );
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
    content.setLabel(view[0].toUpperCase() + view.slice(1));
    renderActionHelp(view, menu.selected);
    screen.render();
  }

  menu.on("select", async (_, index) => {
    if (running || modalActive) return;
    if (currentView === "main")
      return setView(mainItems[index]?.view ?? "main");
    if (currentView === "help") return setView("main");
    const action = currentActions[index];
    if (!action) return;
    if (action.dangerous) {
      modalActive = true;
      const ok = await confirmDialog(screen, {
        title: action.confirmationTitle ?? "Confirm",
        message:
          action.confirmationMessage ?? action.description ?? "Continue?",
        dangerous: true,
      });
      modalActive = false;
      if (!ok) return;
    }

    const rootRequired =
      action.requiresRoot || (await actionNeedsRootForDetectedSystem(action));
    if (rootRequired) {
      modalActive = true;
      const password = await inputDialog(
        screen,
        "Administrator authentication",
        "Enter root password (30s timeout):",
        30000,
      );
      modalActive = false;
      if (!password) {
        appendLogText("[warn] Root authentication canceled.\n", "system");
        setProgressError("root auth canceled");
        return;
      }
      const auth = spawnSync(
        "bash",
        ["scripts/sudo-common.sh", "--validate-stdin"],
        {
          cwd: opts.rootDir,
          input: `${password}\n`,
          encoding: "utf8",
          timeout: 30000,
          env: { ...process.env, ...(action.env ?? {}) },
        },
      );
      if ((auth.status ?? 1) !== 0) {
        appendLogText(
          auth.stderr || "[error] Invalid root password.\n",
          "system",
        );
        setProgressError("invalid root password");
        return;
      }
    }
    if (!action.command) return;
    running = true;
    progressState = "running";
    setProgressRunning(5, "Starting");
    logs.setContent("");
    logHistory.length = 0;
    appendLogText(
      `$ ${action.command} ${(action.args ?? []).join(" ")}\n`,
      "system",
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
            if (latestStatus) overviewStatus = latestStatus;
            detectedNow = Boolean(latestStatus?.installations?.[detectionKey]);
          }
        }
        if (signal === "SIGINT") setProgressCanceled();
        else if (installAction && detectedNow && code !== 0)
          setProgressWarning("Completed with warnings");
        else if (code === 0 || (installAction && detectedNow))
          setProgressSuccess("Completed");
        else setProgressError(signal ?? `exit code ${code ?? "unknown"}`);
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

  const confirmExit = async () => {
    if (modalActive) return;
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
  screen.key(["escape"], () => {
    if (modalActive) return;
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
    if (modalActive) return;
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
  screen.key(["S-pageup", "M-up"], () => {
    content.scroll(-5);
    screen.render();
  });
  screen.key(["S-pagedown", "M-down"], () => {
    content.scroll(5);
    screen.render();
  });
  screen.key(["pageup"], () => {
    logs.scroll(-10);
    screen.render();
  });
  screen.key(["pagedown"], () => {
    logs.scroll(10);
    screen.render();
  });
  screen.key(["home"], () => {
    logs.setScrollPerc(0);
    screen.render();
  });
  screen.key(["end"], () => {
    logs.setScrollPerc(100);
    screen.render();
  });
  screen.key(["?"], () => {
    if (!running && !modalActive) setView("help");
  });
  menu.on("keypress", (_, key) => {
    if (
      (key.name === "up" || key.name === "down") &&
      ["install", "development", "maintenance"].includes(currentView)
    ) {
      clearProgressOnNavigation();
      renderActionHelp(currentView, menu.selected);
      screen.render();
    }
  });
  menu.on("select item", () => {
    if (["install", "development", "maintenance"].includes(currentView)) {
      clearProgressOnNavigation();
      renderActionHelp(currentView, menu.selected);
      screen.render();
    }
  });

  setView("main");
  void refreshDetectedInstallations("startup");
  renderDiagnosticsBox();
  menu.focus();
  return screen;
}
