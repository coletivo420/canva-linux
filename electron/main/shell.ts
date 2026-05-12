export type DebugLog = (category: string, ...args: unknown[]) => boolean;
export type NativeThemeLike = {
  shouldUseDarkColors: boolean;
};
export type WebContentsLike = {
  id?: number;
  loadURL(url: string): Promise<void> | void;
  getURL(): string;
  isDestroyed(): boolean;
  send(channel: string, ...args: unknown[]): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
};
export type WebContentsViewLike = {
  webContents: WebContentsLike;
  setVisible(visible: boolean): void;
};
export type BrowserWindowLike = {
  show(): void;
  once(event: string, listener: (...args: unknown[]) => void): unknown;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  loadURL(url: string): Promise<void> | void;
  getContentSize(): [number, number];
  setBackgroundColor(color: string): void;
  contentView: {
    children?: unknown[];
    addChildView(view: unknown): void;
    removeChildView(view: unknown): void;
  };
};

type ShellHelpersOptions = {
  appIconPath: string;
  appName: string;
  BrowserWindow: new (options: Record<string, unknown>) => BrowserWindowLike;
  debugLog: DebugLog;
  layoutViews: () => void;
  nativeTheme: NativeThemeLike;
  WebContentsView: new (
    options: Record<string, unknown>,
  ) => WebContentsViewLike;
};

type CreateShellWindowOptions = {
  setMainWindow(value: BrowserWindowLike | null): void;
};

type CreateToolbarViewOptions = {
  broadcastTabsState(): void;
  ensureTopLevelView(view: WebContentsViewLike): void;
  layoutViews(): void;
  makeToolbarUrl(): string;
  preloadPath: string;
  setToolbarView(value: WebContentsViewLike): void;
};

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 */

/**
 * @typedef {{
 *   shouldUseDarkColors: boolean;
 * }} NativeThemeLike
 */

/**
 * @typedef {{
 *   id?: number;
 *   loadURL(url: string): Promise<void> | void;
 *   getURL(): string;
 *   isDestroyed(): boolean;
 *   send(channel: string, ...args: unknown[]): void;
 *   on(event: string, listener: (...args: any[]) => void): unknown;
 * }} WebContentsLike
 */

/**
 * @typedef {{
 *   webContents: WebContentsLike;
 *   setVisible(visible: boolean): void;
 * }} WebContentsViewLike
 */

/**
 * @typedef {{
 *   show(): void;
 *   once(event: string, listener: (...args: unknown[]) => void): unknown;
 *   on(event: string, listener: (...args: unknown[]) => void): unknown;
 *   loadURL(url: string): Promise<void> | void;
 *   getContentSize(): [number, number];
 *   setBackgroundColor(color: string): void;
 *   contentView: { children?: unknown[], addChildView(view: unknown): void, removeChildView(view: unknown): void };
 * }} BrowserWindowLike
 */

/**
 * @param {{
 *   appIconPath: string;
 *   appName: string;
 *   BrowserWindow: new (options: Record<string, unknown>) => BrowserWindowLike;
 *   debugLog: DebugLog;
 *   layoutViews: () => void;
 *   nativeTheme: NativeThemeLike;
 *   WebContentsView: new (options: Record<string, unknown>) => WebContentsViewLike;
 * }} options
 */
export function createShellHelpers({
  appIconPath,
  appName,
  BrowserWindow,
  debugLog,
  layoutViews,
  nativeTheme,
  WebContentsView,
}: ShellHelpersOptions) {
  function shellBackgroundColor(): string {
    return nativeTheme.shouldUseDarkColors ? "#1f2329" : "#f6f7fb";
  }

  /**
   * @param {{ setMainWindow(value: BrowserWindowLike | null): void }} options
   * @returns {BrowserWindowLike}
   */
  function createShellWindow({
    setMainWindow,
  }: CreateShellWindowOptions): BrowserWindowLike {
    debugLog("app", "create-shell-window");
    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      minWidth: 1024,
      minHeight: 680,
      title: appName,
      autoHideMenuBar: true,
      backgroundColor: shellBackgroundColor(),
      show: false,
      icon: appIconPath,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: true,
      },
    });

    mainWindow.once("ready-to-show", () => {
      debugLog("app", "main-window-ready");
      mainWindow.show();
    });
    mainWindow.loadURL(
      `data:text/html,<html><body style="margin:0;background:${shellBackgroundColor()}"></body></html>`,
    );
    mainWindow.on("resize", () => {
      debugLog("view", "window-resize", ...mainWindow.getContentSize());
      layoutViews();
    });
    mainWindow.on("maximize", () => {
      debugLog("view", "window-maximize");
      layoutViews();
    });
    mainWindow.on("unmaximize", () => {
      debugLog("view", "window-unmaximize");
      layoutViews();
    });
    mainWindow.on("closed", () => {
      setMainWindow(null);
    });

    setMainWindow(mainWindow);
    return mainWindow;
  }

  /**
   * @param {{
   *   broadcastTabsState(): void;
   *   ensureTopLevelView(view: WebContentsViewLike): void;
   *   layoutViews(): void;
   *   makeToolbarUrl(): string;
   *   preloadPath: string;
   *   setToolbarView(value: WebContentsViewLike): void;
   * }} options
   * @returns {WebContentsViewLike}
   */
  function createToolbarView({
    broadcastTabsState,
    ensureTopLevelView,
    layoutViews,
    makeToolbarUrl,
    preloadPath,
    setToolbarView,
  }: CreateToolbarViewOptions): WebContentsViewLike {
    debugLog("tabs:toolbar", "create-toolbar-view");
    const toolbarView = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    ensureTopLevelView(toolbarView);
    toolbarView.setVisible(true);
    toolbarView.webContents.on("dom-ready", () => {
      debugLog(
        "tabs:toolbar",
        "toolbar-dom-ready",
        toolbarView.webContents.getURL() || "about:blank",
      );
    });
    toolbarView.webContents.on("did-finish-load", () => {
      debugLog(
        "tabs:toolbar",
        "toolbar-loaded",
        toolbarView.webContents.getURL() || "about:blank",
      );
      broadcastTabsState();
    });
    toolbarView.webContents.on(
      "did-fail-load",
      (
        _event: unknown,
        code: number,
        description: string,
        validatedURL: string,
        isMainFrame: boolean,
      ) => {
        debugLog(
          "tabs:toolbar",
          "toolbar-fail-load",
          `mainFrame=${isMainFrame ? "true" : "false"}`,
          `code=${code}`,
          description || "no-description",
          validatedURL || "unknown-url",
        );
      },
    );
    toolbarView.webContents.on(
      "console-message",
      (
        event: {
          level?: number;
          message?: string;
          lineNumber?: number;
          sourceId?: string;
        },
        legacyLevel: unknown,
        legacyMessage: string,
        legacyLine: unknown,
        legacySourceId: string,
      ) => {
        const level = event.level ?? legacyLevel;
        const message = event.message ?? legacyMessage;
        const lineNumber = event.lineNumber ?? legacyLine;
        const sourceId = event.sourceId ?? legacySourceId;

        debugLog(
          "tabs:toolbar",
          "toolbar-console",
          `level=${level}`,
          `line=${lineNumber}`,
          sourceId || "inline",
          message,
        );
      },
    );
    toolbarView.webContents.on(
      "render-process-gone",
      (_event: unknown, details: { reason?: string; exitCode?: number }) => {
        debugLog(
          "tabs:toolbar",
          "toolbar-render-process-gone",
          `reason=${details?.reason || "unknown"}`,
          `exitCode=${details?.exitCode ?? "unknown"}`,
        );
      },
    );
    toolbarView.webContents.on("unresponsive", () => {
      debugLog("tabs:toolbar", "toolbar-unresponsive");
    });
    toolbarView.webContents.on("responsive", () => {
      debugLog("tabs:toolbar", "toolbar-responsive");
    });
    toolbarView.webContents.loadURL(makeToolbarUrl());
    setToolbarView(toolbarView);
    layoutViews();
    return toolbarView;
  }

  return {
    createShellWindow,
    createToolbarView,
    shellBackgroundColor,
  };
}
