type DebugLog = (category: string, ...args: unknown[]) => boolean;
type WebContentsLike = { id?: number };
type CapturedImageLike = {
  getSize(): { width: number; height: number };
  toDataURL(): string;
};
type WebContentsViewLike = {
  getBounds(): { width: number; height: number };
  webContents: { capturePage(): Promise<CapturedImageLike> };
};
type TabEntry = { id: number; view: WebContentsViewLike };
type FindTabByWebContentsFn = (
  webContents: WebContentsLike,
) => TabEntry | null | undefined;
type IpcMainLike = {
  handle(
    channel: string,
    listener: (
      event: { sender: WebContentsLike },
      ...args: unknown[]
    ) => unknown,
  ): void;
};

function resolveRequestingTab(
  sender: WebContentsLike,
  findTabByWebContents: FindTabByWebContentsFn,
): TabEntry | null {
  return findTabByWebContents(sender) || null;
}

function validateSnapshotRequester(
  sender: WebContentsLike,
  tab: TabEntry | null | undefined,
): tab is TabEntry {
  return Boolean(sender && tab && tab.view);
}

// Bridge the preload-only eyedropper UI with the main-process tab capture API.
// The preload asks for a snapshot of its owning Canva tab; the main process is
// the only place that can safely capture the BrowserView backing that tab.
function registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents,
}: {
  ipcMain: IpcMainLike;
  debugLog: DebugLog;
  webContentsLabel: (webContents: WebContentsLike) => string;
  findTabByWebContents: FindTabByWebContentsFn;
}): void {
  ipcMain.handle("wrapper:eyedropper-snapshot", async (event) => {
    debugLog(
      "eyedropper:bridge",
      "snapshot-request",
      webContentsLabel(event.sender),
    );

    const tab = resolveRequestingTab(event.sender, findTabByWebContents);

    if (!validateSnapshotRequester(event.sender, tab)) {
      debugLog(
        "eyedropper:bridge",
        "snapshot-missing-tab",
        webContentsLabel(event.sender),
      );
      throw new Error(
        "The active Canva tab was not found for the eyedropper snapshot.",
      );
    }

    const bounds = tab.view.getBounds();
    const image = await tab.view.webContents.capturePage();
    const size = image.getSize();
    const cssWidth = Math.max(1, bounds.width);
    const cssHeight = Math.max(1, bounds.height);

    // Keep the preload working in CSS pixels even though capturePage() returns
    // native pixel dimensions from the BrowserView surface.
    debugLog(
      "eyedropper:bridge",
      "snapshot",
      `${size.width}x${size.height}`,
      "css",
      `${cssWidth}x${cssHeight}`,
    );

    return {
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      cssWidth,
      cssHeight,
    };
  });
}

export {
  registerEyeDropperBridge,
  resolveRequestingTab,
  validateSnapshotRequester,
};

export type { FindTabByWebContentsFn };
