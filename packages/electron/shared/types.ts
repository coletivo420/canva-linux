export type DebugLog = (category: string, ...args: unknown[]) => boolean;

export type WebContentsLike = {
  id?: number;
  session?: { partition?: string };
  getURL(): string;
  isLoading?(): boolean;
  getLastWebPreferences?():
    | {
        contextIsolation?: boolean;
        nodeIntegration?: boolean;
        sandbox?: boolean;
      }
    | null
    | undefined;
  isDestroyed(): boolean;
  focus(): void;
  send(channel: string, ...args: unknown[]): void;
  loadURL(url: string): Promise<void> | void;
  executeJavaScript(code: string): Promise<unknown>;
  insertCSS(css: string): Promise<unknown>;
  destroy(): void;
  setWindowOpenHandler(
    handler: (details: {
      url: string;
      openerUrl?: string;
      disposition?: string;
      frameName?: string;
    }) => {
      action: "allow" | "deny";
      overrideBrowserWindowOptions?: Record<string, unknown>;
    },
  ): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
  once?(event: string, listener: (...args: any[]) => void): unknown;
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
