// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  registerEyeDropperBridge,
  resolveRequestingTab,
  validateSnapshotRequester,
} = loadRuntimeModule("main/eyedropper-bridge");

test("resolveRequestingTab scopes lookup to the requesting webContents", () => {
  const sender = { id: 22 };
  const expectedTab = /** @type {any} */ { id: 3, view: {} };

  assert.equal(
    resolveRequestingTab(
      sender,
      (/** @type {{ id?: number }} */ webContents) =>
        webContents === sender ? expectedTab : null,
    ),
    expectedTab,
  );
  assert.equal(
    resolveRequestingTab({ id: 99 }, () => null),
    null,
  );
});

test("validateSnapshotRequester requires a resolved tab with a view", () => {
  assert.equal(
    validateSnapshotRequester(
      { id: 1 },
      /** @type {any} */ { id: 1, view: {} },
    ),
    true,
  );
  assert.equal(validateSnapshotRequester({ id: 1 }, null), false);
  assert.equal(
    validateSnapshotRequester({ id: 1 }, /** @type {any} */ { id: 1 }),
    false,
  );
});

test("registerEyeDropperBridge captures the resolved tab view", async () => {
  const sender = { id: 44 };
  /** @type {unknown[][]} */
  const debugEntries = [];
  /** @type {undefined | ((event: { sender: { id: number } }) => Promise<unknown>)} */
  let handler;

  registerEyeDropperBridge({
    ipcMain: {
      /**
       * @param {string} channel
       * @param {(event: { sender: { id: number } }) => Promise<unknown>} listener
       */
      handle(channel, listener) {
        assert.equal(channel, "wrapper:eyedropper-snapshot");
        handler = listener;
      },
    },
    /**
     * @param {string} category
     * @param {...unknown} args
     * @returns {boolean}
     */
    debugLog(category, ...args) {
      debugEntries.push([category, ...args]);
      return true;
    },
    /**
     * @param {{ id?: number }} webContents
     * @returns {string}
     */
    webContentsLabel(webContents) {
      return webContents === sender ? "tab-7" : "unknown";
    },
    /**
     * @param {{ id?: number }} webContents
     * @returns {any}
     */
    findTabByWebContents(webContents) {
      if (webContents !== sender) return null;
      return {
        id: 7,
        view: {
          getBounds() {
            return { width: 320, height: 180 };
          },
          webContents: {
            capturePage() {
              return Promise.resolve({
                getSize() {
                  return { width: 640, height: 360 };
                },
                toDataURL() {
                  return "data:image/png;base64,ok";
                },
              });
            },
          },
        },
      };
    },
  });

  assert.equal(typeof handler, "function");
  assert.ok(handler);
  const snapshot = await handler({ sender });

  assert.deepEqual(snapshot, {
    dataUrl: "data:image/png;base64,ok",
    width: 640,
    height: 360,
    cssWidth: 320,
    cssHeight: 180,
  });
  assert.deepEqual(debugEntries[0], [
    "eyedropper:bridge",
    "snapshot-request",
    "tab-7",
  ]);
  assert.deepEqual(debugEntries[1], [
    "eyedropper:bridge",
    "snapshot",
    "640x360",
    "css",
    "320x180",
  ]);
});
