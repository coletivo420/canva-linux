'use strict';

// @ts-check

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {{ id?: number }} WebContentsLike
 * @typedef {{ getBounds(): { width: number, height: number }, webContents: { capturePage(): Promise<{ getSize(): { width: number, height: number }, toDataURL(): string }> } }} WebContentsViewLike
 * @typedef {{ id: number, view: WebContentsViewLike }} TabEntry
 * @typedef {(webContents: WebContentsLike) => TabEntry | null | undefined} FindTabByWebContentsFn
 * @typedef {{ handle(channel: string, listener: (event: { sender: WebContentsLike }, ...args: unknown[]) => unknown): void }} IpcMainLike
 */

/**
 * @param {WebContentsLike} sender
 * @param {FindTabByWebContentsFn} findTabByWebContents
 * @returns {TabEntry | null}
 */
function resolveRequestingTab(sender, findTabByWebContents) {
  return findTabByWebContents(sender) || null;
}

/**
 * @param {WebContentsLike} sender
 * @param {TabEntry | null | undefined} tab
 * @returns {boolean}
 */
function validateSnapshotRequester(sender, tab) {
  return Boolean(sender && tab && tab.view);
}

// Bridge the preload-only eyedropper UI with the main-process tab capture API.
// The preload asks for a snapshot of its owning Canva tab; the main process is
// the only place that can safely capture the BrowserView backing that tab.
/**
 * @param {{
 *   ipcMain: IpcMainLike;
 *   debugLog: DebugLog;
 *   webContentsLabel: (webContents: WebContentsLike) => string;
 *   findTabByWebContents: FindTabByWebContentsFn;
 * }} options
 * @returns {void}
 */
function registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents,
}) {
  ipcMain.handle('wrapper:eyedropper-snapshot', async (event) => {
    debugLog('eyedropper:bridge', 'snapshot-request', webContentsLabel(event.sender));

    const tab = resolveRequestingTab(event.sender, findTabByWebContents);

    if (!validateSnapshotRequester(event.sender, tab) || !tab) {
      debugLog('eyedropper:bridge', 'snapshot-missing-tab', webContentsLabel(event.sender));
      throw new Error('The active Canva tab was not found for the eyedropper snapshot.');
    }

    const bounds = tab.view.getBounds();
    const image = await tab.view.webContents.capturePage();
    const size = image.getSize();
    const cssWidth = Math.max(1, bounds.width);
    const cssHeight = Math.max(1, bounds.height);

    // Keep the preload working in CSS pixels even though capturePage() returns
    // native pixel dimensions from the BrowserView surface.
    debugLog('eyedropper:bridge', 'snapshot', `${size.width}x${size.height}`, 'css', `${cssWidth}x${cssHeight}`);

    return {
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      cssWidth,
      cssHeight,
    };
  });
}

module.exports = {
  registerEyeDropperBridge,
  resolveRequestingTab,
  validateSnapshotRequester,
};
