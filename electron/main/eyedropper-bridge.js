'use strict';

// Bridge the preload-only eyedropper UI with the main-process tab capture API.
// The preload asks for a snapshot of its owning Canva tab; the main process is
// the only place that can safely capture the BrowserView backing that tab.
function registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents,
}) {
  ipcMain.handle('wrapper:eyedropper-snapshot', async (event) => {
    debugLog('eyedropper:bridge', 'snapshot-request', webContentsLabel(event.sender));

    const tab = findTabByWebContents(event.sender);

    if (!tab) {
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
};
