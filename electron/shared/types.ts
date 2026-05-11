export type DebugLog = (category: string, ...args: unknown[]) => boolean;

export type SessionLike = {
  partition?: string;
};

export type WebContentsPreferencesLike = {
  contextIsolation?: boolean;
  nodeIntegration?: boolean;
  sandbox?: boolean;
};

export type WindowOpenHandlerDetails = {
  url: string;
  openerUrl?: string;
  disposition?: string;
  frameName?: string;
};

export type WindowOpenHandlerResult = {
  action: "allow" | "deny";
  overrideBrowserWindowOptions?: Record<string, unknown>;
};

export type WebContentsLike = {
  id?: number;
  session?: SessionLike;
  getURL(): string;
  loadURL(url: string): Promise<void> | void;
  isDestroyed(): boolean;
  send(channel: string, ...args: unknown[]): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
  once(event: string, listener: (...args: any[]) => void): unknown;
  focus(): void;
  destroy(): void;
  reload(): void;
  executeJavaScript(code: string): Promise<unknown>;
  insertCSS(css: string): Promise<unknown>;
  getLastWebPreferences(): WebContentsPreferencesLike | null | undefined;
  setWindowOpenHandler(
    handler: (details: WindowOpenHandlerDetails) => WindowOpenHandlerResult,
  ): void;
};

export type WebContentsViewLike = {
  webContents: WebContentsLike;
  setVisible(visible: boolean): void;
  setBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void;
};

export type TabEntry = {
  id: number;
  title: string;
  url: string;
  favicon: string | null;
  isHome: boolean;
  createdAt: number;
  view: WebContentsViewLike;
};
